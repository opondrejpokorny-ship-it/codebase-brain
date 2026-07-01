import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { buildCodeRelations, relatedPathsForChangedFiles, summarizeCodeGraph } from "@/lib/codeGraphUtils";
import { buildContextPack } from "@/lib/contextPackBuilder";
import { resolveContextDepthPreset } from "@/lib/contextRelevanceScoring";
import {
  calibrateImpactAnalysisOutput,
  compareProjectAndPrRepository,
  extractChangedFiles,
  formatPrDiffForImpactAnalysis,
  heuristicRiskSignals,
  initialRiskLevel,
} from "@/lib/impactAnalysisUtils";
import { buildImpactAnalysisPromptWithDepth } from "@/lib/impactAnalysisPromptBuilder";
import { formatRiskMemoryForPrompt, mergeAnalysisHistories, readLocalAnalysisHistory } from "@/lib/analysisHistoryUtils";
import { formatProjectRulesForPrompt, getProjectRulesForRuntime } from "@/lib/projectRulesUtils";
import { exampleImpactDiff, fallbackProjectFromFiles, fetchPublicGithubPrDiffWithFallback, optionalEntity } from "@/lib/impactAnalysisRuntimeUtils";
import { buildImpactAnalysisHistoryRecord, persistImpactAnalysisHistory } from "@/lib/impactAnalysisHistoryRuntime";

function llmText(value) {
  if (typeof value === "string") return value;
  if (value == null) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function useImpactAnalysis(projectId) {
  const { toast } = useToast();
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [changeInput, setChangeInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState("");
  const [riskLevel, setRiskLevel] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [prUrl, setPrUrl] = useState("");
  const [fetchingPr, setFetchingPr] = useState(false);
  const [prMeta, setPrMeta] = useState(null);
  const [contextDepth, setContextDepth] = useState("balanced");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [projects, storedFiles] = await Promise.all([
        base44.entities.CodebaseProject.filter({ id: projectId }).catch(() => []),
        base44.entities.CodeFile.filter({ project_id: projectId }).catch(() => []),
      ]);
      const remoteAnalysisEntity = optionalEntity("CodebaseAnalysis");
      const remoteAnalyses = remoteAnalysisEntity?.filter
        ? await remoteAnalysisEntity.filter({ project_id: projectId }, "created_date", 30).catch(() => [])
        : [];
      const localAnalyses = readLocalAnalysisHistory(projectId);
      if (!cancelled) {
        setProject(projects?.[0] || fallbackProjectFromFiles(storedFiles));
        setFiles(storedFiles || []);
        setAnalyses(mergeAnalysisHistories(remoteAnalyses || [], localAnalyses || []));
      }
    }
    load();
    return () => { cancelled = true; };
  }, [projectId]);

  const depthPreset = useMemo(() => resolveContextDepthPreset(contextDepth), [contextDepth]);
  const changedFiles = useMemo(() => extractChangedFiles(changeInput), [changeInput]);
  const signals = useMemo(() => heuristicRiskSignals(changeInput, changedFiles), [changeInput, changedFiles]);
  const heuristicRisk = useMemo(() => initialRiskLevel(changeInput, changedFiles), [changeInput, changedFiles]);
  const codeRelations = useMemo(() => buildCodeRelations(files), [files]);
  const graphSummary = useMemo(() => summarizeCodeGraph(codeRelations), [codeRelations]);
  const relatedPaths = useMemo(() => relatedPathsForChangedFiles(codeRelations, changedFiles), [codeRelations, changedFiles]);
  const compatibility = useMemo(() => compareProjectAndPrRepository(project, prMeta), [project, prMeta]);
  const contextPackPreview = useMemo(() => {
    if (!changeInput.trim() || files.length === 0) return null;
    return buildContextPack({
      files,
      relations: codeRelations,
      question: changeInput,
      changedFiles,
      diffText: changeInput,
      maxTokens: depthPreset.maxTokens,
      depth: contextDepth,
    });
  }, [files, codeRelations, changeInput, changedFiles, depthPreset.maxTokens, contextDepth]);

  const handleFetchPr = async () => {
    if (!prUrl.trim()) {
      toast({ title: "Paste a public GitHub PR URL first", variant: "destructive" });
      return;
    }
    setFetchingPr(true);
    try {
      const fetched = await fetchPublicGithubPrDiffWithFallback(prUrl.trim());
      setPrMeta(fetched);
      setChangeInput(formatPrDiffForImpactAnalysis(fetched));
      setResult("");
      setRiskLevel(null);
      const fetchedCompatibility = compareProjectAndPrRepository(project, fetched);
      toast({
        title: fetchedCompatibility.status === "mismatch" ? "PR diff loaded with repository warning" : "PR diff loaded",
        description: `${fetched.repositoryFullName}#${fetched.prNumber} · ${fetched.changedFilesCount || fetched.changedFiles?.length || 0} files`,
        variant: fetchedCompatibility.status === "mismatch" ? "destructive" : undefined,
      });
    } catch (error) {
      toast({ title: "Failed to fetch PR diff", description: error?.message || "The PR must be public and accessible.", variant: "destructive" });
    } finally {
      setFetchingPr(false);
    }
  };

  const useExample = () => {
    setChangeInput(exampleImpactDiff);
    setPrMeta(null);
  };

  const updateChangeInput = (value) => {
    setChangeInput(value);
    setPrMeta(null);
  };

  const handleAnalyze = async () => {
    if (!changeInput.trim()) {
      toast({ title: "Paste a diff or changed file list first", variant: "destructive" });
      return;
    }
    setAnalyzing(true);
    setResult("");
    setRiskLevel(null);

    try {
      const preChangedFiles = extractChangedFiles(changeInput);
      const preSignals = heuristicRiskSignals(changeInput, preChangedFiles);
      const preRelatedPaths = relatedPathsForChangedFiles(codeRelations, preChangedFiles);
      const riskMemoryText = formatRiskMemoryForPrompt(analyses, preChangedFiles, preRelatedPaths, preSignals);
      const projectRulesText = formatProjectRulesForPrompt(getProjectRulesForRuntime(projectId));
      const payload = buildImpactAnalysisPromptWithDepth({ project, files, changeInput, relations: codeRelations, riskMemoryText, projectRulesText, contextDepth });
      const answer = await base44.integrations.Core.InvokeLLM({ prompt: payload.prompt });
      const answerText = llmText(answer) || "No analysis was generated.";
      const calibrated = calibrateImpactAnalysisOutput({ text: answerText, heuristicRisk: payload.heuristicRisk, signals: payload.signals, changeInput });
      setResult(calibrated.text);
      setRiskLevel(calibrated.riskLevel);

      const historyRecord = buildImpactAnalysisHistoryRecord({ projectId, prMeta, compatibility, changeInput, calibrated, payload });
      await persistImpactAnalysisHistory(projectId, historyRecord, setAnalyses);
    } catch (error) {
      toast({ title: "Impact analysis failed", description: error?.message || "The AI request failed.", variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  return {
    project,
    files,
    changeInput,
    updateChangeInput,
    analyzing,
    result,
    riskLevel,
    analyses,
    prUrl,
    setPrUrl,
    fetchingPr,
    prMeta,
    contextDepth,
    setContextDepth,
    depthPreset,
    changedFiles,
    signals,
    heuristicRisk,
    codeRelations,
    graphSummary,
    relatedPaths,
    compatibility,
    contextPackPreview,
    handleFetchPr,
    useExample,
    handleAnalyze,
  };
}
