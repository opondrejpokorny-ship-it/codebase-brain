import { PackageSearch } from "lucide-react";

export default function FocusedResolveAudit({ metadata }) {
  const latest = metadata?.lastFocusedResolve || null;
  if (!latest) return null;

  const history = Array.isArray(metadata.focusedResolveHistory) ? metadata.focusedResolveHistory : [];
  const importedPaths = Array.isArray(latest.importedPaths) ? latest.importedPaths : [];
  const missingTargets = Array.isArray(latest.missingTargets) ? latest.missingTargets : [];

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs font-medium text-slate-700 flex items-center gap-1.5"><PackageSearch className="w-3.5 h-3.5 text-slate-400" />Focused resolve audit</p>
          <p className="text-xs text-slate-400 mt-1">Last missing-context re-index step.</p>
        </div>
        <span className="text-xs bg-slate-50 text-slate-600 px-2 py-1 rounded-md">{history.length || 1} run{(history.length || 1) === 1 ? "" : "s"}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div className="rounded-lg bg-slate-50 px-3 py-2"><p className="text-xs text-slate-400">Imported</p><p className="font-semibold text-slate-800">{latest.importedFilesCount ?? 0}</p></div>
        <div className="rounded-lg bg-slate-50 px-3 py-2"><p className="text-xs text-slate-400">Still missing</p><p className="font-semibold text-slate-800">{latest.missingTargetsCount ?? 0}</p></div>
        <div className="rounded-lg bg-slate-50 px-3 py-2"><p className="text-xs text-slate-400">Queued</p><p className="font-semibold text-slate-800">{latest.queuedTargetsCount ?? "—"}</p></div>
        <div className="rounded-lg bg-slate-50 px-3 py-2"><p className="text-xs text-slate-400">Branch</p><p className="font-semibold text-slate-800 truncate">{latest.branch || "—"}</p></div>
      </div>

      <div className="mt-3 text-xs text-slate-500 space-y-1">
        {latest.resolvedAt && <p>Resolved at: <span className="font-mono text-slate-700">{latest.resolvedAt}</span></p>}
        {importedPaths.length > 0 && <p>Imported paths: <span className="font-mono text-slate-700">{importedPaths.slice(0, 4).join(", ")}{importedPaths.length > 4 ? ` +${importedPaths.length - 4} more` : ""}</span></p>}
        {missingTargets.length > 0 && <p className="text-amber-700">Still missing: <span className="font-mono">{missingTargets.slice(0, 4).join(", ")}{missingTargets.length > 4 ? ` +${missingTargets.length - 4} more` : ""}</span></p>}
      </div>
    </div>
  );
}
