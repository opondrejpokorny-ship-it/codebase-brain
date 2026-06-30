import { FileText, Info } from "lucide-react";

export default function SelectedFilesList({ files = [], reasonsByPath = {} }) {
  return (
    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
      {files.map((file) => {
        const reasons = reasonsByPath?.[file.path] || [];
        return (
          <div key={file.path} className="border border-slate-100 rounded-lg p-3">
            <div className="flex items-start gap-2 mb-2">
              <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs font-mono text-slate-800 break-all">{file.path}</p>
            </div>
            {reasons.length > 0 ? (
              <div className="space-y-1">
                {reasons.map((reason) => (
                  <p key={reason} className="text-xs text-slate-500 flex gap-1.5">
                    <Info className="w-3 h-3 text-slate-300 mt-0.5 flex-shrink-0" />
                    <span>{reason}</span>
                  </p>
                ))}
              </div>
            ) : <p className="text-xs text-slate-400">No explicit selection reason captured.</p>}
          </div>
        );
      })}
    </div>
  );
}
