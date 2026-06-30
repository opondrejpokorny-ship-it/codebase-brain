import { Check } from "lucide-react";

function ChecklistItem({ children }) {
  return (
    <li className="flex gap-2 text-sm text-slate-700">
      <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
      <span>{children}</span>
    </li>
  );
}

export default function ImportQueueSidePanel({ importPrompt }) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-heading font-semibold text-sm text-slate-900 mb-3">Manual re-index checklist</h2>
        <ul className="space-y-2">
          <ChecklistItem>Resolve each target to an exact repository file.</ChecklistItem>
          <ChecklistItem>Prefer .js, .jsx, .ts, and .tsx matches.</ChecklistItem>
          <ChecklistItem>Add only resolved files to stored context.</ChecklistItem>
          <ChecklistItem>Rebuild code graph relations after import.</ChecklistItem>
          <ChecklistItem>Run Impact Analysis again and confirm coverage improves.</ChecklistItem>
        </ul>
      </div>
      <div className="bg-slate-900 rounded-xl p-5 text-slate-100">
        <h2 className="font-heading font-semibold text-sm mb-3">Import prompt preview</h2>
        <pre className="text-xs whitespace-pre-wrap break-words text-slate-200 max-h-[360px] overflow-y-auto">{importPrompt}</pre>
      </div>
    </div>
  );
}
