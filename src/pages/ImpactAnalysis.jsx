import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, AlertTriangle, BookOpenCheck, CheckCircle2, DownloadCloud, FileDiff, GitBranch, History, Loader2, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { buildCodeRelations, relatedPathsForChangedFiles, summarizeCodeGraph } from "@/lib/codeGraphUtils";
import { buildContextPack } from "@/lib/contextPackBuilder";
import { fetchPublicGithubPrDiffClient, formatPrDiffForImpactAnalysis } from "@/lib/githubPrUtils";
import { compareProjectAndPrRepository } from "@/lib/repositoryCompatibilityUtils";
import ContextPackInspector from "@/components/projects/ContextPackInspector";
import {
  buildImpactAnalysisPrompt,
  calibrateImpactAnalysisOutput,
  extractChangedFiles,
  heuristicRiskSignals,
  initialRiskLevel,
} from "@/lib/impactAnalysisUtils";
import {
  CURRENT_RISK_CALIBRATION_VERSION,
  createAnalysisHistoryRecord,
  formatRiskMemoryForPrompt,
  mergeAnalysisHistories,
  readLocalAnalysisHistory,
  writeLocalAnalysisRecord,
} from "@/lib/analysisHistoryUtils";
import { formatProjectRulesForPrompt, getProjectRulesForRuntime } from "@/lib/projectRulesUtils";

const riskStyles = {
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-red-50 text-red-700 border-red-200",
};

const compatibilityStyles = {
  match: "bg-emerald-50 text-emerald-700 border-emerald-200",
  mismatch: "bg-red-50 text-red-700 border-red-200",
  unknown: "bg-amber-50 text-amber-700 border-amber-200",
};

function riskCalibrationBadge(analysis = {}) {
  const version = Number(analysis.risk_calibration_version || analysis.riskCalibrationVersion || 1);
  const calibrated = version >= CURRENT_RISK_CALIBRATION_VERSION;
  return {
    calibrated,
    label: calibrated ? `calibrated v${version}` : "legacy calibration",
    className: calibrated
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : "bg-slate-50 text-slate-500 border-slate-200",
  };
}

const exampleDiff = `diff --git a/src/lib/contextPackBuilder.js b/src/lib/contextPackBuilder.js
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
    const entity = base44?.entities?.[entityName];
    return entity || null;
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
    const res = await base44.functions.invoke("fetchPublicGithubPrDiff", {
      pr_url: prUrl,
    });
    const data = res?.data || res;
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

export default function ImpactAnalysis() {
  const { id } = useParams();
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
          base44.entities.CodebaseProject.filter({ id }).catch(() => []),
          base44.entities.CodeFile.filter({ project_id: id }).catch(() => []),
        ]);

        const analysisEntity = optionalEntity("CodebaseAnalysis");
        const storedAnalyses = analysisEntity?.filter
          ? await analysisEntity.filter({ project_id: id }, "created_date", 20).catch(() => [])
          : [];
        const localAnalyses = readLocalAnalysisHistory(id);

        if (!cancelled) {
          setProject(projects?.[0] || fallbackProjectFromFiles(id, storedFiles || []));
          setFiles(storedFiles || []);
          setAnalyses(mergeAnalysisHistories(storedAnalyses || [], localAnalyses || []).slice(0, 20));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadImpactContext();

    return () => {
      cancelled = true;
    };
  }, [id]);

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
      toast({
        title: "Failed to fetch PR diff",
        description: error?.message || "The PR must be public and accessible.",
        variant: "destructive",
      });
    } finally {
      setFetchingPr(false);
    }
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
      const projectRulesText = formatProjectRulesForPrompt(getProjectRulesForRuntime(id));
      const payload = buildImpactAnalysisPrompt({ project, files, changeInput, relations: codeRelations, riskMemoryText, projectRulesText });
      const answer = await base44.integrations.Core.InvokeLLM({ prompt: payload.prompt });
      const rawAnswer = answer || "No analysis was generated.";
      const calibrated = calibrateImpactAnalysisOutput({
        text: rawAnswer,
        heuristicRisk: payload.heuristicRisk,
        signals: payload.signals,
        changeInput,
      });
      const finalAnswer = calibrated.text;
      const parsedRisk = calibrated.riskLevel;

      setResult(finalAnswer);
      setRiskLevel(parsedRisk);

      const historyRecord = createAnalysisHistoryRecord({
        projectId: id,
        type: prMeta ? "public_github_pr_impact" : "manual_diff_impact",
        input: changeInput,
        result: finalAnswer,
        riskLevel: parsedRisk,
        changedFiles: payload.changedFiles,
        relatedFiles: payload.relatedPaths,
        riskSignals: payload.signals,
        relevantRelations: payload.relevantRelations.map((relation) => `${relation.from_file}->${relation.to_file || relation.import_path}`),
        relevantFiles: payload.relevantFiles.map((file) => file.path),
        contextPack: payload.contextPack,
        repositoryCompatibility: prMeta ? compatibility : null,
        prMetadata: prMeta
          ? {
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
            }
          : null,
      });

      const localSaved = writeLocalAnalysisRecord(id, historyRecord);
      if (localSaved) setAnalyses((prev) => mergeAnalysisHistories([localSaved], prev).slice(0, 20));

      try {
        const analysisEntity = optionalEntity("CodebaseAnalysis");
        if (!analysisEntity?.create) return;

        const saved = await analysisEntity.create(historyRecord);
        setAnalyses((prev) => mergeAnalysisHistories([saved], prev).slice(0, 20));
      } catch {
        // Base44 analysis entity is optional. Local Risk Memory already saved the report.
      }
    } catch (error) {
      toast({
        title: "Impact analysis failed",
        description: error?.message || "The AI request failed.",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!project && files.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Project context not found.</p>
        <p className="text-xs text-slate-400 mt-1">Open Impact Analysis from the project list so the route contains a real project ID.</p>
        <Link to="/impact" className="text-sm text-slate-900 underline mt-2 inline-block cursor-pointer">
          Pick a project
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to={`/project/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors duration-150 cursor-pointer">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Project
      </Link>

      {project?.metadata_missing && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-sm text-amber-800 flex gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>Project metadata was not found, but stored files exist. Impact analysis is using the available file context.</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="font-heading text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileDiff className="w-5 h-5 text-slate-500" />
              Manual PR / Diff Impact Analysis
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Paste a public GitHub PR URL, diff, or changed file list. Codebase Brain compares it with the stored project context and Code Graph Lite relations.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 justify-center">
              {files.length} stored files
            </Badge>
            <Link to={`/project/${id}/rules`}>
              <Button variant="outline" size="sm" className="cursor-pointer gap-2 w-full sm:w-auto">
                <BookOpenCheck className="w-4 h-4" />
                Project Rules
              </Button>
            </Link>
            <Link to={`/project/${id}/risk-memory`}>
              <Button variant="outline" size="sm" className="cursor-pointer gap-2 w-full sm:w-auto">
                <History className="w-4 h-4" />
                Risk Memory
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <div>
              <h2 className="font-heading font-semibold text-sm text-slate-900">Public GitHub PR</h2>
              <p className="text-xs text-slate-400 mt-1">Optional: load a public PR diff automatically before analysis.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={prUrl}
                onChange={(event) => setPrUrl(event.target.value)}
                placeholder="https://github.com/owner/repo/pull/123"
                disabled={fetchingPr}
              />
              <Button type="button" variant="outline" onClick={handleFetchPr} disabled={fetchingPr || !prUrl.trim()} className="gap-2 cursor-pointer whitespace-nowrap">
                {fetchingPr ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
                {fetchingPr ? "Fetching…" : "Fetch PR diff"}
              </Button>
            </div>
            {prMeta && (
              <div className="space-y-2">
                <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-sm text-blue-800">
                  <p className="font-medium truncate">{prMeta.repositoryFullName}#{prMeta.prNumber}: {prMeta.title}</p>
                  <p className="text-xs mt-1">
                    {prMeta.changedFilesCount || prMeta.changedFiles?.length || 0} files · +{prMeta.additions || 0} -{prMeta.deletions || 0} · source: {prMeta.source || "unknown"}
                    {prMeta.truncated ? " · diff truncated" : ""}
                  </p>
                </div>
                <div className={`rounded-lg border px-3 py-2 text-sm ${compatibilityStyles[compatibility.status] || compatibilityStyles.unknown}`}>
                  <p className="font-medium flex items-center gap-1.5">
                    {compatibility.status === "match" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    Repository compatibility: {compatibility.status}
                  </p>
                  <p className="text-xs mt-1">{compatibility.message}</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading font-semibold text-sm text-slate-900">Change input</h2>
              <button
                type="button"
                className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                onClick={() => {
                  setChangeInput(exampleDiff);
                  setPrMeta(null);
                }}
              >
                Use example
              </button>
            </div>
            <Textarea
              value={changeInput}
              onChange={(event) => {
                setChangeInput(event.target.value);
                setPrMeta(null);
              }}
              rows={16}
              className="font-mono text-sm"
              placeholder="Paste a git diff, PR patch, or changed file list here…"
            />
            <Button onClick={handleAnalyze} disabled={analyzing || !changeInput.trim()} className="gap-2 cursor-pointer">
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {analyzing ? "Analyzing…" : "Analyze Impact"}
            </Button>
          </div>

          {result && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="font-heading font-semibold text-sm text-slate-900">Analysis result</h2>
                {riskLevel && (
                  <Badge variant="outline" className={riskStyles[riskLevel] || riskStyles.medium}>
                    {riskLevel} risk
                  </Badge>
                )}
              </div>
              <ReactMarkdown className="prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                {result}
              </ReactMarkdown>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-heading font-semibold text-sm text-slate-900 mb-3">Pre-scan</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-slate-400 mb-1">Heuristic risk</p>
                <Badge variant="outline" className={riskStyles[heuristicRisk] || riskStyles.medium}>
                  {heuristicRisk}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Changed files detected</p>
                {changedFiles.length ? (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {changedFiles.slice(0, 12).map((file) => (
                      <p key={file} className="text-xs font-mono text-slate-700 truncate">{file}</p>
                    ))}
                    {changedFiles.length > 12 && <p className="text-xs text-slate-400">+{changedFiles.length - 12} more</p>}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No file paths detected yet.</p>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Code Graph Lite</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-slate-50 px-2 py-1.5">
                    <p className="text-slate-400">Relations</p>
                    <p className="font-semibold text-slate-700">{graphSummary.totalRelations}</p>
                  </div>
                  <div className="rounded-md bg-slate-50 px-2 py-1.5">
                    <p className="text-slate-400">Related files</p>
                    <p className="font-semibold text-slate-700">{relatedPaths.length}</p>
                  </div>
                </div>
                {relatedPaths.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
                    {relatedPaths.slice(0, 8).map((file) => (
                      <p key={file} className="text-xs font-mono text-slate-700 truncate flex items-center gap-1.5">
                        <GitBranch className="w-3 h-3 text-slate-400" />
                        {file}
                      </p>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Risk signals</p>
                {signals.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {signals.map((signal) => (
                      <span key={signal} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                        {signal}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">None detected yet.</p>
                )}
              </div>
            </div>
          </div>

          {contextPackPreview && <ContextPackInspector contextPack={contextPackPreview} changedFiles={changedFiles} projectId={id} />}

          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-sm text-amber-800 flex gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              This does not run tests or comment on GitHub yet. It only analyzes a public PR diff or submitted diff against the stored imported sample.
            </p>
          </div>

          {analyses.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="font-heading font-semibold text-sm text-slate-900">Recent analyses</h3>
                <Link to={`/project/${id}/risk-memory`} className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer">
                  View memory
                </Link>
              </div>
              <div className="space-y-2">
                {analyses.slice(0, 6).map((analysis) => {
                  const calibration = riskCalibrationBadge(analysis);
                  return (
                    <div key={analysis.id} className="border border-slate-100 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className={riskStyles[analysis.risk_level] || riskStyles.medium}>
                            {analysis.risk_level || "medium"}
                          </Badge>
                          <Badge variant="outline" className={calibration.className}>
                            {calibration.label}
                          </Badge>
                        </div>
                        <span className="text-xs text-slate-400 flex-shrink-0">
                          {analysis.created_date ? new Date(analysis.created_date).toLocaleDateString() : ""}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {(analysis.result || "").replace(/[#*_`]/g, "").slice(0, 160)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
