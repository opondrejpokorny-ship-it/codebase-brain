import { Badge } from "@/components/ui/badge";

function badgeClass(status) {
  if (status === "complete" || status === "good") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "partial") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

export default function CoverageCard({ coverage }) {
  return (
    <div className="mb-4 rounded-lg bg-slate-50 border border-slate-100 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-700">Context coverage</p>
          <p className="text-xs text-slate-500 mt-1">Resolved imports: {coverage.resolvedInternal}/{coverage.total}</p>
        </div>
        <Badge variant="outline" className={badgeClass(coverage.status)}>{coverage.status} · {coverage.score}%</Badge>
      </div>
      {coverage.missing > 0 && <p className="text-xs text-amber-700 mt-2">{coverage.missing} missing direct import target(s).</p>}
    </div>
  );
}
