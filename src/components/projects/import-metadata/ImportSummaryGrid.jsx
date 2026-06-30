import { sourceLabel } from "@/lib/importMetadataDisplayUtils";

export default function ImportSummaryGrid({ metadata }) {
  const imported = Number(metadata.importedFilesCount ?? metadata.imported_count ?? 0);
  const attempted = Number(metadata.attemptedFiles ?? metadata.attempted_count ?? 0);
  const skipped = Number(metadata.skippedFiles ?? metadata.skipped_count ?? 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
      <div className="rounded-lg bg-slate-50 px-3 py-2"><p className="text-xs text-slate-400">Imported</p><p className="font-semibold text-slate-800">{Number.isFinite(imported) ? imported : "—"}</p></div>
      <div className="rounded-lg bg-slate-50 px-3 py-2"><p className="text-xs text-slate-400">Attempted</p><p className="font-semibold text-slate-800">{Number.isFinite(attempted) ? attempted : "—"}</p></div>
      <div className="rounded-lg bg-slate-50 px-3 py-2"><p className="text-xs text-slate-400">Skipped</p><p className="font-semibold text-slate-800">{Number.isFinite(skipped) ? skipped : "—"}</p></div>
      <div className="rounded-lg bg-slate-50 px-3 py-2"><p className="text-xs text-slate-400">Source</p><p className="font-semibold text-slate-800 truncate">{sourceLabel(metadata.source)}</p></div>
    </div>
  );
}
