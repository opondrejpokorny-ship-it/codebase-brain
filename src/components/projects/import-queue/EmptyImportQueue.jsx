import { TriangleAlert } from "lucide-react";

export default function EmptyImportQueue() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
      <TriangleAlert className="w-8 h-8 text-slate-300 mx-auto mb-2" />
      <p className="text-sm font-medium text-slate-700">No missing context targets queued.</p>
      <p className="text-xs text-slate-400 mt-1">Run Impact Analysis and use Add to queue when missing context candidates appear.</p>
    </div>
  );
}
