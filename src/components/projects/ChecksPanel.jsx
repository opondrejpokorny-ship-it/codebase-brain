// @ts-nocheck

export default function ChecksPanel({ checks = [] }) {
  if (!checks.length) return null;

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="grid md:grid-cols-2 gap-2">
        {checks.map((check) => (
          <div key={check.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div className="text-sm font-medium text-slate-800">{check.label}</div>
            <p className="text-xs text-slate-500 mt-1">{check.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
