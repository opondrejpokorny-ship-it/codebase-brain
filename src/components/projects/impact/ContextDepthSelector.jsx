import { CONTEXT_DEPTH_PRESETS } from "@/lib/contextRelevanceScoring";

const DEPTH_ORDER = ["minimal", "balanced", "deep"];

export default function ContextDepthSelector({ value = "balanced", onChange }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-700 mb-2">Context depth</p>
      <div className="grid grid-cols-3 gap-2">
        {DEPTH_ORDER.map((depth) => {
          const preset = CONTEXT_DEPTH_PRESETS[depth];
          const active = value === depth;
          return (
            <button
              key={depth}
              type="button"
              onClick={() => onChange?.(depth)}
              className={`rounded-md border px-2 py-2 text-left cursor-pointer transition-colors ${active ? "bg-white border-slate-300 text-slate-900 shadow-sm" : "bg-transparent border-slate-200 text-slate-500 hover:text-slate-800"}`}
            >
              <p className="text-xs font-semibold">{preset.label}</p>
              <p className="text-[11px] mt-0.5">{Math.round(preset.maxTokens / 1000)}k tokens</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
