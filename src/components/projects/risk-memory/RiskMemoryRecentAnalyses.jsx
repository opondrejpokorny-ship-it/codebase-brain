import { Badge } from "@/components/ui/badge";

const riskStyles = {
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-red-50 text-red-700 border-red-200",
  unknown: "bg-slate-50 text-slate-600 border-slate-200",
};

function depthLabel(analysis = {}) {
  return analysis.context_depth_preset || analysis.contextDepthPreset || analysis.context_pack?.depthPreset || analysis.contextPack?.depthPreset || null;
}

function tokenStats(analysis = {}) {
  const selected = analysis.context_selected_tokens || analysis.contextSelectedTokens || analysis.context_pack?.efficiency?.selectedFileTokens || analysis.contextPack?.efficiency?.selectedFileTokens || analysis.context_pack?.efficiency?.selectedTokens || analysis.contextPack?.efficiency?.selectedTokens || null;
  const full = analysis.context_full_repo_tokens || analysis.contextFullRepoTokens || analysis.context_pack?.efficiency?.fullRepoTokens || analysis.contextPack?.efficiency?.fullRepoTokens || null;
  const savings = analysis.context_savings_percent || analysis.contextSavingsPercent || analysis.context_pack?.efficiency?.savingsPercent || analysis.contextPack?.efficiency?.savingsPercent || null;
  const total = analysis.context_total_tokens || analysis.contextTotalTokens || analysis.context_pack?.efficiency?.totalContextTokens || analysis.contextPack?.efficiency?.totalContextTokens || null;
  if (!selected && !full && !total && savings == null) return null;
  return { selected, full, savings, total };
}

function formatTokens(value) {
  if (!Number.isFinite(Number(value))) return "—";
  const num = Number(value);
  return num >= 1000 ? `${Math.round(num / 100) / 10}k` : String(num);
}

export default function RiskMemoryRecentAnalyses({ analyses = [] }) {
  if (!analyses.length) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h2 className="font-heading font-semibold text-sm text-slate-900 mb-3">Recent analyses</h2>
      <div className="space-y-3">
        {analyses.slice(0, 12).map((analysis) => {
          const stats = tokenStats(analysis);
          const contextDepth = depthLabel(analysis);
          return (
            <div key={analysis.id || analysis.created_date} className="border border-slate-100 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={riskStyles[analysis.risk_level] || riskStyles.unknown}>{analysis.risk_level || "unknown"} risk</Badge>
                  {contextDepth && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{contextDepth} context</Badge>}
                  {analysis.storage_source && <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">{analysis.storage_source}</Badge>}
                </div>
                <span className="text-xs text-slate-400">{analysis.created_date ? new Date(analysis.created_date).toLocaleString() : ""}</span>
              </div>
              {stats && (
                <div className="flex flex-wrap gap-1.5 mb-2 text-xs text-slate-500">
                  <span className="bg-slate-50 border border-slate-100 px-2 py-1 rounded-md">selected files {formatTokens(stats.selected)} tokens</span>
                  {stats.total && stats.total !== stats.selected && <span className="bg-slate-50 border border-slate-100 px-2 py-1 rounded-md">prompt total {formatTokens(stats.total)} tokens</span>}
                  {stats.full && <span className="bg-slate-50 border border-slate-100 px-2 py-1 rounded-md">full repo {formatTokens(stats.full)} tokens</span>}
                  {stats.savings != null && <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-1 rounded-md">files saved {stats.savings}%</span>}
                </div>
              )}
              {analysis.changed_files?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {analysis.changed_files.slice(0, 5).map((file) => <span key={file} className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{file}</span>)}
                  {analysis.changed_files.length > 5 && <span className="text-xs text-slate-400 px-2 py-1">+{analysis.changed_files.length - 5} more</span>}
                </div>
              )}
              <p className="text-sm text-slate-500 line-clamp-3">{(analysis.result || "").replace(/[#*_`]/g, "").slice(0, 260)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
