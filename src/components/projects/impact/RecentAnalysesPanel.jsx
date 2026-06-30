import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { impactRiskStyles, riskCalibrationBadge } from "@/lib/impactAnalysisDisplayUtils";

function contextDepthLabel(analysis = {}) {
  return analysis.context_depth_preset || analysis.contextDepthPreset || analysis.context_pack?.depthPreset || analysis.contextPack?.depthPreset || null;
}

export default function RecentAnalysesPanel({ projectId, analyses = [] }) {
  if (!analyses.length) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="font-heading font-semibold text-sm text-slate-900">Recent analyses</h3>
        <Link to={`/project/${projectId}/risk-memory`} className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer">View memory</Link>
      </div>
      <div className="space-y-2">
        {analyses.slice(0, 6).map((analysis) => {
          const calibration = riskCalibrationBadge(analysis);
          const depthLabel = contextDepthLabel(analysis);
          return (
            <div key={analysis.id} className="border border-slate-100 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className={impactRiskStyles[analysis.risk_level] || impactRiskStyles.medium}>{analysis.risk_level || "medium"}</Badge>
                  <Badge variant="outline" className={calibration.className}>{calibration.label}</Badge>
                  {depthLabel && <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">{depthLabel} context</Badge>}
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0">{analysis.created_date ? new Date(analysis.created_date).toLocaleDateString() : ""}</span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2">{(analysis.result || "").replace(/[#*_`]/g, "").slice(0, 160)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
