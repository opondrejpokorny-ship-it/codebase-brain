import { GitBranch, Link2, Package, AlertTriangle, Network } from "lucide-react";
import { buildCodeRelations, summarizeCodeGraph } from "@/lib/codeGraphUtils";

function relationLabel(relation) {
  if (relation.target_kind === "external_package") return relation.package_name || relation.import_path;
  return relation.to_file || relation.import_path;
}

export default function CodeRelationsCard({ files = [], relations: providedRelations = null, relationSource = "in_memory" }) {
  const relations = providedRelations || buildCodeRelations(files);
  const summary = summarizeCodeGraph(relations);
  const internalRelations = relations.filter((relation) => relation.target_kind === "internal_file").slice(0, 12);
  const externalImports = relations.filter((relation) => relation.target_kind === "external_package").slice(0, 18);
  const unresolved = relations.filter((relation) => relation.target_kind === "unresolved" || relation.target_kind === "alias").slice(0, 10);

  if (!files.length && !relations.length) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-heading font-semibold text-sm text-slate-900 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-slate-500" />
            Code Graph Lite
          </h3>
          <p className="text-xs text-slate-400 mt-1">Lightweight import/require relationships from stored files. Source: {relationSource}.</p>
        </div>
        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
          {summary.totalRelations} relations
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm mb-4">
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
          <p className="text-xs text-slate-400">Alias unresolved</p>
          <p className="font-semibold text-slate-800">{summary.aliasUnresolvedImports}</p>
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
          {summary.topConnectedFiles?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Network className="w-3 h-3" />
                Top connected files
              </p>
              <div className="flex flex-wrap gap-1.5">
                {summary.topConnectedFiles.slice(0, 8).map((item) => (
                  <span key={item.path} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-mono">
                    {item.path} · {item.score}
                  </span>
                ))}
              </div>
            </div>
          )}

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
                  </div>
                ))}
              </div>
            </div>
          )}

          {externalImports.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Package className="w-3 h-3" />
                External packages
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[...new Set(externalImports.map((relation) => relation.package_name || relation.import_path))].slice(0, 18).map((name) => (
                  <span key={name} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-mono">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {unresolved.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
              <p className="font-medium flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3 h-3" />
                Graph coverage warning
              </p>
              <p>{unresolved.length} shown unresolved imports may mean the imported repository sample is incomplete or aliases need deeper config support.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
