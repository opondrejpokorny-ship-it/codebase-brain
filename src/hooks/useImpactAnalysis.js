import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { buildCodeRelations, relatedPathsForChangedFiles, summarizeCodeGraph } from "@/lib/codeGraphUtils";
import { buildContextPack } from "@/lib/contextPackBuilder";
import { formatPrDiffForImpactAnalysis } from "@/lib/githubPrUtils";
import { compareProjectAndPrRepository } from "@/lib/repositoryCompatibilityUtils";
import {
  buildImpactAnalysisPrompt,
  calibrateImpactAnalysisOutput,
  extractChangedFiles,
  heuristicRiskSignals,
  initialRiskLevel,
} from "@/lib/impactAnalysisUtils";
import {
  formatRiskMemoryForPrompt,
  mergeAnalysisHistories,
  readLocalAnalysisHistory,
} from "@/lib/analysisHistoryUtils";
import { formatProjectRulesForPrompt, getProjectRulesForRuntime } from "@/lib/projectRulesUtils";
import { buildImpactAnalysisHistoryRecord, persistImpactAnalysisHistory } from "@/lib/impactAnalysisHistoryRuntime";
import {
  exampleImpactDiff,
  fallbackProjectFromFiles,
  fetchPublicGithubPrDiffWithFallback,
  optionalEntity,
} from "@/lib/impactAnalysisRuntimeUtils";

export function useImpactAnalysis(projectId) {
  const { toast } = useToast();
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [prUrl, setPrUrl] = useState("");
  const [prMeta, setPrMeta] = useState(null);
  const [changeInput, setChangeInput] = useState("");
  const [result, setResult] = useState("");
  const [riskLevel, setRiskLevel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchingPr, setFetchingPr] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadImpactContext() {
      setLoading(true);
      try {
        const [projects, storedFiles] = await Promise.all([
          base44.entities.CodebaseProject.filter({ id: projectId }).catch(() => []),
          base44.entities.CodeFile.filter({ project_id: projectId }).catch(() => []),
        ]);
        const analysisEntity = optionalEntity("CodebaseAnalysis");
        const storedAnalyses = analysisEntity?.filter ? await analysisEntity.filter({ project_id: projectId }, "created_date", 20).catch(() => []) : [];
        const localAnalyses = readLocalAnalysisHistory(projectId);

        if (!cancelled) {
          setProject(projects?.[0] || fallbackProjectFromFiles(projectId, storedFiles || []));
          setFiles(storedFiles || []);
          setAnalyses(mergeAnalysisHistories(storedAnalyses || [], localAnalyses || []).slice(0, 20));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadImpactContext();
    return () => { cancelled = true; };
  }, [projectId]);

  const changedFiles = useMemo(() => extractChangedFiles(changeInput), [changeInput]);
  const signals = useMemo(() => heuristicRiskSignals(changeInput, changedFiles), [changeInput, changedFiles]);
  const heuristicRisk = useMemo(() => initialRiskLevel(changeInput, changedFiles), [changeInput, changedFiles]);
  const codeRelations = useMemo(() => buildCodeRelations(files), [files]);
  const graphSummary = useMemo(() => summarizeCodeGraph(codeRelations), [codeRelations]);
  const relatedPaths = useMemo(() => relatedPathsForChangedFiles(codeRelations, changedFiles), [codeRelations, changedFiles]);
  const compatibility = useMemo(() => compareProjectAndPrRepository(project, prMeta), [project, prMeta]);
  const contextPackPreview = useMemo(() => {
    if (!changeInput.trim() || files.length === 0) return null;
    return buildContextPack({ project, files, relations: codeRelations, question: changeInput, changedFiles, diffText: changeInput, maxTokens: 12000 });
  }, [project, files, codeRelations, changeInput, changedFiles]);

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
      const payload = buildImpactAnalysisPrompt({ project, files, changeInput, relations: codeRelations, riskMemoryText, projectRulesText });
      const answer = await base44.integrations.Core.InvokeLLM({ prompt: payload.prompt });
      const calibrated = calibrateImpactAnalysisOutput({ text: answer || "No analysis was generated.", heuristicRisk: payload.heuristicRisk, signals: payload.signals, changeInput });
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
    analyses,
    prUrl,
    setPrUrl,
    prMeta,
    changeInput,
    updateChangeInput,
    result,
    riskLevel,
    loading,
    fetchingPr,
    analyzing,
    changedFiles,
    signals,
    heuristicRisk,
    graphSummary,
    relatedPaths,
    compatibility,
    contextPackPreview,
    handleFetchPr,
    handleAnalyze,
    useExample,
  };
}
