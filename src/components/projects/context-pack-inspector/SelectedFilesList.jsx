import { FileText, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function scoreClass(score) {
  if (score >= 100) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (score >= 50) return "bg-blue-50 text-blue-700 border-blue-200";
  if (score > 0) return "bg-slate-50 text-slate-600 border-slate-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

export default function SelectedFilesList({ files = [], reasonsByPath = {}, relevanceScores = {} }) {
  return (
    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
      {files.map((file) => {
        const reasons = reasonsByPath?.[file.path] || [];
        const score = relevanceScores?.[file.path];
        return (
          <div key={file.path} className="border border-slate-100 rounded-lg p-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-start gap-2 min-w-0">
                <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs font-mono text-slate-800 break-all">{file.path}</p>
              </div>
              {Number.isFinite(score) && <Badge variant="outline" className={`${scoreClass(score)} flex-shrink-0`}>score {score}</Badge>}
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
