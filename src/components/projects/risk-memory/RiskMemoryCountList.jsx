import { Badge } from "@/components/ui/badge";

export default function RiskMemoryCountList({ title, icon: Icon, items = [], emptyText }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h2 className="font-heading font-semibold text-sm text-slate-900 mb-3 flex items-center gap-2">
        <Icon className="w-4 h-4 text-slate-500" />
        {title}
      </h2>
      {items.length ? (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.name} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-xs font-mono text-slate-700 break-all">{item.name}</p>
              <Badge variant="outline" className="bg-white text-slate-600 border-slate-200 flex-shrink-0">{item.count}×</Badge>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">{emptyText}</p>
      )}
    </div>
  );
}
