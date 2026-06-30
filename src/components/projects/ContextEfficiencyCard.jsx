import { Gauge, Info } from "lucide-react";
import { buildContextEfficiencyReport, formatEstimatedTokens } from "@/lib/tokenBudgetUtils";

export default function ContextEfficiencyCard({
  allFiles = [],
  selectedFiles = [],
  extraContextText = "",
  title = "Context Efficiency",
  description = "Codebase Brain sends only relevant files and relationships to AI.",
}) {
  const report = buildContextEfficiencyReport({ allFiles, selectedFiles, extraContextText });

  if (!allFiles.length) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-heading font-semibold text-sm text-slate-900 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-slate-500" />
            {title}
          </h3>
          <p className="text-xs text-slate-400 mt-1">{description}</p>
        </div>
        <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-md">
          estimated {report.savingsPercent}% saved
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-400">Full repo estimate</p>
          <p className="font-semibold text-slate-800">{formatEstimatedTokens(report.fullRepoTokens)} tokens</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-400">Selected context</p>
          <p className="font-semibold text-slate-800">{formatEstimatedTokens(report.selectedTokens)} tokens</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-400">Estimated saved</p>
          <p className="font-semibold text-slate-800">{formatEstimatedTokens(report.savedTokens)} tokens</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-400">Files selected</p>
          <p className="font-semibold text-slate-800">{report.selectedFileCount}/{report.totalFileCount}</p>
        </div>
      </div>

      <div className="flex items-start gap-2 text-xs text-slate-500 mt-3">
        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <p>Token counts are rough estimates, not exact billing numbers. They help compare whole-repo context versus selected context.</p>
      </div>
    </div>
  );
}
