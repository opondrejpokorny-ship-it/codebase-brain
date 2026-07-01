// @ts-nocheck
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BarChart3, Braces, Download, FileWarning, GitBranch, History, Loader2, ShieldAlert, TestTube2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import RiskMemoryCountList from "@/components/projects/risk-memory/RiskMemoryCountList";
import RiskMemoryRecentAnalyses from "@/components/projects/risk-memory/RiskMemoryRecentAnalyses";
import { useRiskMemory } from "@/hooks/useRiskMemory";
import { verdictFromPrAnalysis } from "@/lib/prAnalysisOverlayUtils";
import { downloadMarkdownReport } from "@/lib/reportDownloadUtils";
import { formatRiskReportMarkdown } from "@/lib/riskReportExportUtils";

function countVerdicts(analyses = []) {
  return analyses.reduce((acc, analysis) => {
    const verdict = verdictFromPrAnalysis(analysis);
    acc[verdict] = (acc[verdict] || 0) + 1;
    return acc;
  }, { SAFE: 0, REVIEW: 0, BLOCK: 0 });
}

export default function RiskMemory() {
  const { id } = useParams();
  const { project, analyses, memory, loading, historySource } = useRiskMemory(id);
  const verdictCounts = useMemo(() => countVerdicts(analyses), [analyses]);
  const riskReportMarkdown = useMemo(() => formatRiskReportMarkdown({ project, analyses, memory, historySource }), [project, analyses, memory, historySource]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
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
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="font-heading text-xl font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-slate-500" />
              Risk Memory
            </h1>
            {project?.name && <p className="text-xs text-slate-400 mt-1">Project: {project.name}</p>}
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Persistent memory from previous impact analyses. It highlights repeated risk areas, high-risk files, changed symbols, common testing recommendations, review verdicts, and recent reports.
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Source: {historySource}. Base44 `CodebaseAnalysis` is optional; local history keeps the feature usable before schema setup.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="cursor-pointer gap-2 w-full sm:w-auto"
              onClick={() => downloadMarkdownReport(project?.name || "project", "risk-report", riskReportMarkdown)}
            >
              <Download className="w-4 h-4" />
              Export risk report
            </Button>
            <Link to={`/project/${id}/impact`}>
              <Button variant="outline" className="cursor-pointer gap-2 w-full sm:w-auto">
                <ShieldAlert className="w-4 h-4" />
                New impact analysis
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {!analyses.length ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <History className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h2 className="font-heading font-semibold text-slate-900">No analysis history yet</h2>
          <p className="text-sm text-slate-500 mt-1 mb-5">
            Run at least one impact analysis for this project. The report will be saved into local Risk Memory immediately.
          </p>
          <Link to={`/project/${id}/impact`}>
            <Button className="cursor-pointer">Run impact analysis</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400 mb-1">Analyses</p>
              <p className="text-2xl font-bold text-slate-900">{memory.totalAnalyses}</p>
            </div>
            <div className="bg-white rounded-xl border border-red-200 p-4">
              <p className="text-xs text-red-400 mb-1">High risk</p>
              <p className="text-2xl font-bold text-red-700">{memory.riskCounts.high}</p>
            </div>
            <div className="bg-white rounded-xl border border-amber-200 p-4">
              <p className="text-xs text-amber-500 mb-1">Medium risk</p>
              <p className="text-2xl font-bold text-amber-700">{memory.riskCounts.medium}</p>
            </div>
            <div className="bg-white rounded-xl border border-emerald-200 p-4">
              <p className="text-xs text-emerald-500 mb-1">Low risk</p>
              <p className="text-2xl font-bold text-emerald-700">{memory.riskCounts.low}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-emerald-200 p-4">
              <p className="text-xs text-emerald-500 mb-1">SAFE verdicts</p>
              <p className="text-2xl font-bold text-emerald-700">{verdictCounts.SAFE}</p>
            </div>
            <div className="bg-white rounded-xl border border-amber-200 p-4">
              <p className="text-xs text-amber-500 mb-1">REVIEW verdicts</p>
              <p className="text-2xl font-bold text-amber-700">{verdictCounts.REVIEW}</p>
            </div>
            <div className="bg-white rounded-xl border border-red-200 p-4">
              <p className="text-xs text-red-500 mb-1">BLOCK verdicts</p>
              <p className="text-2xl font-bold text-red-700">{verdictCounts.BLOCK}</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <RiskMemoryCountList title="High-risk files" icon={FileWarning} items={memory.highRiskFiles} emptyText="No file has appeared in a high-risk analysis yet." />
            <RiskMemoryCountList title="Frequently changed files" icon={GitBranch} items={memory.frequentlyChangedFiles} emptyText="No changed-file history yet." />
            <RiskMemoryCountList title="Frequently changed symbols" icon={Braces} items={memory.frequentlyChangedSymbols} emptyText="No changed-symbol history yet." />
            <RiskMemoryCountList title="Repeated risk signals" icon={BarChart3} items={memory.repeatedRiskSignals} emptyText="No repeated risk signals yet." />
            <RiskMemoryCountList title="Common recommended tests" icon={TestTube2} items={memory.commonRecommendedTests} emptyText="No recommended tests have been captured yet." />
          </div>

          <RiskMemoryRecentAnalyses analyses={analyses} />
        </>
      )}
    </div>
  );
}
