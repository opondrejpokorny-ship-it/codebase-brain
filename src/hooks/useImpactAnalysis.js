import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { buildCodeRelations, relatedPathsForChangedFiles, summarizeCodeGraph } from "@/lib/codeGraphUtils";
import { buildContextPack } from "@/lib/contextPackBuilder";
import { fetchPublicGithubPrDiffClient, formatPrDiffForImpactAnalysis } from "@/lib/githubPrUtils";
import { compareProjectAndPrRepository } from "@/lib/repositoryCompatibilityUtils";
import {
  buildImpactAnalysisPrompt,
  calibrateImpactAnalysisOutput,
  extractChangedFiles,
  heuristicRiskSignals,
  initialRiskLevel,
} from "@/lib/impactAnalysisUtils";
import {
  createAnalysisHistoryRecord,
  formatRiskMemoryForPrompt,
  mergeAnalysisHistories,
  readLocalAnalysisHistory,
  writeLocalAnalysisRecord,
} from "@/lib/analysisHistoryUtils";
import { formatProjectRulesForPrompt, getProjectRulesForRuntime } from "@/lib/projectRulesUtils";

export const exampleImpactDiff = `diff --git a/src/lib/contextPackBuilder.js b/src/lib/contextPackBuilder.js
--- a/src/lib/contextPackBuilder.js
+++ b/src/lib/contextPackBuilder.js
@@ -1,5 +1,8 @@
 export function buildContextPack(input) {
+  // prefer graph-confirmed related files before keyword matches
   return selectCompactContext(input);
 }

src/pages/ImpactAnalysis.jsx`;

function optionalEntity(entityName) {
  try {
    return base44?.entities?.[entityName] || null;
  } catch {
    return null;
  }
}

function fallbackProjectFromFiles(projectId, storedFiles = []) {
  if (!storedFiles.length) return null;
  return {
    id: projectId,
    name: "Stored project context",
    status: "indexed",
    repository_url: null,
    detected_stack: [],
    summary: "Project metadata was not found, but stored files exist. Using available code context for impact analysis.",
    metadata_missing: true,
  };
}

async function fetchPublicGithubPrDiff(prUrl) {
  try {
    const response = await base44.functions.invoke("fetchPublicGithubPrDiff", { pr_url: prUrl });
    const data = response?.data || response;
    if (data?.error) throw new Error(data.error);
    if (data?.diff) return data;
    throw new Error("Backend PR fetch returned an unexpected response.");
  } catch (backendError) {
    const fallback = await fetchPublicGithubPrDiffClient(prUrl);
    return {
      ...fallback,
      source: "client_fallback_after_backend_error",
      backendError: backendError?.message || String(backendError),
    };
  }
}

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
        const storedAnalyses = analysisEntity?.filter
          ? await analysisEntity.filter({ project_id: projectId }, "created_date", 20).catch(() => [])
          : [];
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
    return buildContextPack({
      project,
      files,
      relations: codeRelations,
      question: changeInput,
      changedFiles,
      diffText: changeInput,
      maxTokens: 12000,
    });
  }, [project, files, codeRelations, changeInput, changedFiles]);

  const handleFetchPr = async () => {
    if (!prUrl.trim()) {
      toast({ title: "Paste a public GitHub PR URL first", variant: "destructive" });
      return;
    }
    setFetchingPr(true);
    try {
      const fetched = await fetchPublicGithubPrDiff(prUrl.trim());
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

      const historyRecord = createAnalysisHistoryRecord({
        projectId,
        type: prMeta ? "public_github_pr_impact" : "manual_diff_impact",
        input: changeInput,
        result: calibrated.text,
        riskLevel: calibrated.riskLevel,
        changedFiles: payload.changedFiles,
        relatedFiles: payload.relatedPaths,
        riskSignals: payload.signals,
        relevantRelations: payload.relevantRelations.map((relation) => `${relation.from_file}->${relation.to_file || relation.import_path}`),
        relevantFiles: payload.relevantFiles.map((file) => file.path),
        contextPack: payload.contextPack,
        repositoryCompatibility: prMeta ? compatibility : null,
        prMetadata: prMeta ? {
          repositoryFullName: prMeta.repositoryFullName,
          prNumber: prMeta.prNumber,
          title: prMeta.title,
          state: prMeta.state,
          htmlUrl: prMeta.htmlUrl,
          baseRef: prMeta.baseRef,
          headRef: prMeta.headRef,
          changedFilesCount: prMeta.changedFilesCount,
          additions: prMeta.additions,
          deletions: prMeta.deletions,
          truncated: prMeta.truncated,
          source: prMeta.source,
          backendError: prMeta.backendError || null,
        } : null,
      });

      const localSaved = writeLocalAnalysisRecord(projectId, historyRecord);
      if (localSaved) setAnalyses((prev) => mergeAnalysisHistories([localSaved], prev).slice(0, 20));

      try {
        const analysisEntity = optionalEntity("CodebaseAnalysis");
        if (!analysisEntity?.create) return;
        const saved = await analysisEntity.create(historyRecord);
        setAnalyses((prev) => mergeAnalysisHistories([saved], prev).slice(0, 20));
      } catch {
        // Local Risk Memory already saved the report.
      }
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
