import { FileText, GitBranch, Info, PackageSearch, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatEstimatedTokens } from "@/lib/tokenBudgetUtils";

function relationLabel(relation) {
  if (!relation) return "";
  return `${relation.from_file} ${relation.relation_type} ${relation.import_path}${relation.to_file ? ` → ${relation.to_file}` : ""}`;
}

export default function ContextPackInspector({ contextPack }) {
  if (!contextPack) return null;

  const selectedFiles = contextPack.selectedFiles || [];
  const selectedRelations = contextPack.selectedRelations || [];
  const warnings = contextPack.warnings || [];
  const efficiency = contextPack.efficiency || {};

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-heading font-semibold text-sm text-slate-900 flex items-center gap-2">
            <PackageSearch className="w-4 h-4 text-slate-500" />
            Context Pack Inspector
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Shows which files were selected for AI context and why.
          </p>
        </div>
        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 flex-shrink-0">
          {selectedFiles.length} files
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
        <div className="rounded-md bg-slate-50 px-2 py-2">
          <p className="text-slate-400">Selected</p>
          <p className="font-semibold text-slate-700">{formatEstimatedTokens(efficiency.selectedTokens || contextPack.estimatedTokens || 0)}</p>
        </div>
        <div className="rounded-md bg-slate-50 px-2 py-2">
          <p className="text-slate-400">Full repo</p>
          <p className="font-semibold text-slate-700">{formatEstimatedTokens(efficiency.fullRepoTokens || 0)}</p>
        </div>
        <div className="rounded-md bg-emerald-50 px-2 py-2">
          <p className="text-emerald-500">Saved</p>
          <p className="font-semibold text-emerald-700">{efficiency.savingsPercent || 0}%</p>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-100 p-3">
          <p className="text-xs font-medium text-amber-800 flex items-center gap-1.5 mb-2">
            <TriangleAlert className="w-3.5 h-3.5" />
            Context warnings
          </p>
          <div className="space-y-1">
            {warnings.map((warning) => (
              <p key={warning} className="text-xs text-amber-700">• {warning}</p>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {selectedFiles.map((file) => {
          const reasons = contextPack.reasons?.[file.path] || [];
          return (
            <div key={file.path} className="border border-slate-100 rounded-lg p-3">
              <div className="flex items-start gap-2 mb-2">
                <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs font-mono text-slate-800 break-all">{file.path}</p>
              </div>
              {reasons.length > 0 ? (
                <div className="space-y-1">
                  {reasons.map((reason) => (
                    <p key={reason} className="text-xs text-slate-500 flex gap-1.5">
                      <Info className="w-3 h-3 text-slate-300 mt-0.5 flex-shrink-0" />
                      <span>{reason}</span>
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No explicit selection reason captured.</p>
              )}
            </div>
          );
        })}
      </div>

      {selectedRelations.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-700 flex items-center gap-1.5 mb-2">
            <GitBranch className="w-3.5 h-3.5 text-slate-400" />
            Selected graph relations
          </p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {selectedRelations.slice(0, 12).map((relation, index) => (
              <p key={`${relation.from_file}-${relation.import_path}-${index}`} className="text-xs font-mono text-slate-500 break-all">
                {relationLabel(relation)}
              </p>
            ))}
            {selectedRelations.length > 12 && (
              <p className="text-xs text-slate-400">+{selectedRelations.length - 12} more relations</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
