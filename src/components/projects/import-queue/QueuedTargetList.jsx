import { Badge } from "@/components/ui/badge";

function statusBadgeClass(status) {
  return status === "indexed"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-amber-50 text-amber-700 border-amber-200";
}

export default function QueuedTargetList({ resolvedQueue = [] }) {
  return (
    <div className="space-y-2">
      {resolvedQueue.map((item) => (
        <div key={item.target} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-mono text-slate-800 break-all">{item.target}</p>
              {item.matchedPath ? (
                <p className="text-xs text-emerald-700 mt-1 break-all">Matched stored file: {item.matchedPath}</p>
              ) : (
                <p className="text-xs text-amber-700 mt-1 break-all">Not found in stored context yet.</p>
              )}
            </div>
            <Badge variant="outline" className={`${statusBadgeClass(item.status)} flex-shrink-0`}>
              {item.status === "indexed" ? "Indexed" : "Missing"}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
