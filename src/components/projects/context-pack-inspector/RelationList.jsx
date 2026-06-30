import { GitBranch } from "lucide-react";
import { relationLabel } from "@/lib/contextPackInspectorUtils";

export default function RelationList({ title, relations = [], limit = 12 }) {
  if (!relations.length) return null;
  return (
    <div className="mt-4 pt-4 border-t border-slate-100">
      <p className="text-xs font-medium text-slate-700 flex items-center gap-1.5 mb-2">
        <GitBranch className="w-3.5 h-3.5 text-slate-400" />
        {title}
      </p>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {relations.slice(0, limit).map((relation, index) => (
          <p key={`${relation.from_file}-${relation.import_path}-${index}`} className="text-xs font-mono text-slate-500 break-all">
            {relationLabel(relation)}
          </p>
        ))}
        {relations.length > limit && <p className="text-xs text-slate-400">+{relations.length - limit} more relations</p>}
      </div>
    </div>
  );
}
