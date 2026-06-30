import { GitBranch, Link2, Package, AlertTriangle } from "lucide-react";
import { buildCodeRelations, summarizeCodeGraph } from "@/lib/codeGraphUtils";

function relationLabel(relation) {
  if (relation.relation_type === "external_import") return relation.import_path;
  return relation.to_file || relation.import_path;
}

export default function CodeRelationsCard({ files = [] }) {
  const relations = buildCodeRelations(files);
  const summary = summarizeCodeGraph(relations);
  const internalRelations = relations.filter((relation) => relation.relation_type === "imports").slice(0, 12);
  const externalImports = relations.filter((relation) => relation.relation_type === "external_import").slice(0, 8);

  if (!files.length) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-heading font-semibold text-sm text-slate-900 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-slate-500" />
            Code Graph Lite
          </h3>
          <p className="text-xs text-slate-400 mt-1">Lightweight import/require relationships from stored files.</p>
        </div>
        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
          {summary.totalRelations} relations
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-400">Internal</p>
          <p className="font-semibold text-slate-800">{summary.internalRelations}</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-400">External</p>
          <p className="font-semibold text-slate-800">{summary.externalImports}</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-400">Unresolved</p>
          <p className="font-semibold text-slate-800">{summary.unresolvedRelativeImports}</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-400">Files</p>
          <p className="font-semibold text-slate-800">{summary.touchedFiles}</p>
        </div>
      </div>

      {relations.length === 0 ? (
        <div className="rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-500">
          No import/require relations detected in the stored sample yet.
        </div>
      ) : (
        <div className="space-y-4">
          {internalRelations.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Link2 className="w-3 h-3" />
                Internal relations
              </p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {internalRelations.map((relation) => (
                  <div key={`${relation.from_file}-${relation.import_path}-${relation.to_file || "unresolved"}`} className="text-xs rounded-lg border border-slate-100 px-3 py-2">
                    <p className="font-mono text-slate-700 truncate">{relation.from_file}</p>
                    <p className="font-mono text-slate-400 truncate">→ {relationLabel(relation)}</p>
                    {!relation.resolved && (
                      <p className="text-amber-600 flex items-center gap-1 mt-1">
                        <AlertTriangle className="w-3 h-3" /> unresolved in imported sample
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {externalImports.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Package className="w-3 h-3" />
                External imports
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[...new Set(externalImports.map((relation) => relation.import_path))].slice(0, 18).map((name) => (
                  <span key={name} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-mono">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
