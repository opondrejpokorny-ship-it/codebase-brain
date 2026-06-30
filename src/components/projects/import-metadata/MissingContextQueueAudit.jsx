import { PackageSearch } from "lucide-react";

export default function MissingContextQueueAudit({ metadata }) {
  const queue = Array.isArray(metadata?.missingContextQueue) ? metadata.missingContextQueue : [];
  if (!queue.length) return null;

  const statusCounts = queue.reduce((acc, item) => {
    const status = item.status || "queued";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs font-medium text-slate-700 flex items-center gap-1.5"><PackageSearch className="w-3.5 h-3.5 text-slate-400" />Persistent missing context queue</p>
          <p className="text-xs text-slate-400 mt-1">Stored in project import metadata, with local fallback.</p>
        </div>
        <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-md">{queue.length} target{queue.length === 1 ? "" : "s"}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div className="rounded-lg bg-slate-50 px-3 py-2"><p className="text-xs text-slate-400">Queued</p><p className="font-semibold text-slate-800">{statusCounts.queued || queue.length}</p></div>
        <div className="rounded-lg bg-slate-50 px-3 py-2"><p className="text-xs text-slate-400">Indexed</p><p className="font-semibold text-slate-800">{statusCounts.indexed || 0}</p></div>
        <div className="rounded-lg bg-slate-50 px-3 py-2"><p className="text-xs text-slate-400">Failed</p><p className="font-semibold text-slate-800">{statusCounts.failed || 0}</p></div>
        <div className="rounded-lg bg-slate-50 px-3 py-2"><p className="text-xs text-slate-400">Updated</p><p className="font-semibold text-slate-800 truncate">{metadata.missingContextQueueUpdatedAt ? "yes" : "—"}</p></div>
      </div>
      <div className="mt-3 space-y-1 max-h-24 overflow-y-auto">
        {queue.slice(0, 8).map((item) => <p key={item.target} className="text-xs font-mono text-slate-600 truncate">{item.target}</p>)}
        {queue.length > 8 && <p className="text-xs text-slate-400">+{queue.length - 8} more targets</p>}
      </div>
    </div>
  );
}
