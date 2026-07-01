import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import AnalysisResultPanel from "@/components/projects/impact/AnalysisResultPanel";
import ChangeInputPanel from "@/components/projects/impact/ChangeInputPanel";
import ContextDepthSelector from "@/components/projects/impact/ContextDepthSelector";
import ImpactHeader from "@/components/projects/impact/ImpactHeader";
import PreScanPanel from "@/components/projects/impact/PreScanPanel";
import PublicPrPanel from "@/components/projects/impact/PublicPrPanel";
import RecentAnalysesPanel from "@/components/projects/impact/RecentAnalysesPanel";
import ContextPackInspector from "@/components/projects/ContextPackInspector";
import { useImpactAnalysis } from "@/hooks/useImpactAnalysis";

export default function ImpactAnalysis() {
  const { id } = useParams();
  const impact = useImpactAnalysis(id);

  if (impact.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!impact.project && impact.files.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Project context not found.</p>
        <p className="text-xs text-slate-400 mt-1">Open Impact Analysis from the project list so the route contains a real project ID.</p>
        <Link to="/impact" className="text-sm text-slate-900 underline mt-2 inline-block cursor-pointer">Pick a project</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to={`/project/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors duration-150 cursor-pointer">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Project
      </Link>

      {impact.project?.metadata_missing && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-sm text-amber-800 flex gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>Project metadata was not found, but stored files exist. Impact analysis is using the available file context.</p>
        </div>
      )}

      <ImpactHeader projectId={id} filesCount={impact.files.length} />

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-4">
          <PublicPrPanel
            prUrl={impact.prUrl}
            setPrUrl={impact.setPrUrl}
            prMeta={impact.prMeta}
            compatibility={impact.compatibility}
            fetchingPr={impact.fetchingPr}
            onFetchPr={impact.handleFetchPr}
          />

          <ContextDepthSelector value={impact.contextDepth} onChange={impact.setContextDepth} />

          <ChangeInputPanel
            changeInput={impact.changeInput}
            onChangeInput={impact.updateChangeInput}
            onUseExample={impact.useExample}
            onAnalyze={impact.handleAnalyze}
            analyzing={impact.analyzing}
          />

          <AnalysisResultPanel result={impact.result} riskLevel={impact.riskLevel} />
        </div>

        <div className="space-y-4">
          <PreScanPanel
            heuristicRisk={impact.heuristicRisk}
            changedFiles={impact.changedFiles}
            changedSymbols={impact.changedSymbols}
            graphSummary={impact.graphSummary}
            relatedPaths={impact.relatedPaths}
            signals={impact.signals}
          />

          {impact.contextPackPreview && (
            <ContextPackInspector
              contextPack={impact.contextPackPreview}
              changedFiles={impact.changedFiles}
              projectId={id}
              project={impact.project}
            />
          )}

          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-sm text-amber-800 flex gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>This does not run tests or comment on GitHub yet. It only analyzes a public PR diff or submitted diff against the stored imported sample.</p>
          </div>

          <RecentAnalysesPanel projectId={id} analyses={impact.analyses} />
        </div>
      </div>
    </div>
  );
}
