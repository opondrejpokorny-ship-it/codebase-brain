import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, AlertTriangle, FileDiff, Loader2, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import {
  buildImpactAnalysisPrompt,
  extractChangedFiles,
  extractRiskLevelFromAnalysis,
  heuristicRiskSignals,
  initialRiskLevel,
} from "@/lib/impactAnalysisUtils";

const riskStyles = {
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-red-50 text-red-700 border-red-200",
};

const exampleDiff = `diff --git a/src/api/payments.js b/src/api/payments.js
--- a/src/api/payments.js
+++ b/src/api/payments.js
@@ -1,5 +1,8 @@
 export async function createPayment(input) {
+  if (!input.userId) throw new Error("Missing user");
   // changed payment flow here
 }

src/pages/Checkout.jsx`;

export default function ImpactAnalysis() {
  const { id } = useParams();
  const { toast } = useToast();
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [changeInput, setChangeInput] = useState("");
  const [result, setResult] = useState("");
  const [riskLevel, setRiskLevel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.CodebaseProject.filter({ id }),
      base44.entities.CodeFile.filter({ project_id: id }),
      base44.entities.CodebaseAnalysis?.filter ? base44.entities.CodebaseAnalysis.filter({ project_id: id }, "created_date", 20) : Promise.resolve([]),
    ])
      .then(([projects, storedFiles, storedAnalyses]) => {
        setProject(projects[0] || null);
        setFiles(storedFiles || []);
        setAnalyses(storedAnalyses || []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const changedFiles = useMemo(() => extractChangedFiles(changeInput), [changeInput]);
  const signals = useMemo(() => heuristicRiskSignals(changeInput, changedFiles), [changeInput, changedFiles]);
  const heuristicRisk = useMemo(() => initialRiskLevel(changeInput, changedFiles), [changeInput, changedFiles]);

  const handleAnalyze = async () => {
    if (!changeInput.trim()) {
      toast({ title: "Paste a diff or changed file list first", variant: "destructive" });
      return;
    }

    setAnalyzing(true);
    setResult("");
    setRiskLevel(null);

    try {
      const payload = buildImpactAnalysisPrompt({ project, files, changeInput });
      const answer = await base44.integrations.Core.InvokeLLM({ prompt: payload.prompt });
      const finalAnswer = answer || "No analysis was generated.";
      const parsedRisk = extractRiskLevelFromAnalysis(finalAnswer, payload.heuristicRisk);

      setResult(finalAnswer);
      setRiskLevel(parsedRisk);

      try {
        const saved = await base44.entities.CodebaseAnalysis.create({
          project_id: id,
          type: "manual_diff_impact",
          input: changeInput,
          result: finalAnswer,
          risk_level: parsedRisk,
          changed_files: payload.changedFiles,
          risk_signals: payload.signals,
          relevant_files: payload.relevantFiles.map((file) => file.path),
          created_date: new Date().toISOString(),
        });
        setAnalyses((prev) => [saved, ...prev].slice(0, 20));
      } catch {
        // Keep the feature useful even if the new entity has not been created in Base44 yet.
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

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Project not found.</p>
        <Link to="/" className="text-sm text-slate-900 underline mt-2 inline-block cursor-pointer">
          Back to Dashboard
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

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileDiff className="w-5 h-5 text-slate-500" />
              Manual PR / Diff Impact Analysis
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Paste a diff or changed file list. Codebase Brain compares it with the stored project context.
            </p>
          </div>
          <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
            {files.length} stored files
          </Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading font-semibold text-sm text-slate-900">Change input</h2>
              <button
                type="button"
                className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                onClick={() => setChangeInput(exampleDiff)}
              >
                Use example
              </button>
            </div>
            <Textarea
              value={changeInput}
              onChange={(event) => setChangeInput(event.target.value)}
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

          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-sm text-amber-800 flex gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              This does not run tests or inspect the real GitHub PR yet. It only analyzes the submitted diff against the stored imported sample.
            </p>
          </div>

          {analyses.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-heading font-semibold text-sm text-slate-900 mb-3">Recent analyses</h3>
              <div className="space-y-2">
                {analyses.slice(0, 6).map((analysis) => (
                  <div key={analysis.id} className="border border-slate-100 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <Badge variant="outline" className={riskStyles[analysis.risk_level] || riskStyles.medium}>
                        {analysis.risk_level || "medium"}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        {analysis.created_date ? new Date(analysis.created_date).toLocaleDateString() : ""}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {(analysis.result || "").replace(/[#*_`]/g, "").slice(0, 160)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
