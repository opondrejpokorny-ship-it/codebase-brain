import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Eye, Filter, GitBranch, Loader2, Network, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { buildCodeRelations } from "@/lib/codeGraphUtils";
import { extractProjectSymbols } from "@/lib/symbolExtractionUtils";
import { buildGraphLensData, connectedNodeIds, filterGraphLens, relationEvidenceForNode } from "@/lib/graphLensUtils";

const PRIMARY_KINDS = ["page", "component", "backend", "utility", "config", "test", "data", "integration", "external"];

function asAny(value) {
  return /** @type {any} */ (value || {});
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function kindLabel(kind = "") {
  const labels = /** @type {Record<string, string>} */ ({
    directory: "Directory",
    page: "Page / route",
    component: "Component",
    backend: "Backend/API",
    utility: "Utility/service",
    config: "Config",
    test: "Test",
    data: "Data/schema",
    integration: "Integration",
    external: "External",
    file: "File",
  });
  return labels[kind] || kind;
}

function edgeOpacity(edge, selectedId, connected) {
  if (!selectedId) return edge.kind === "contains" ? 0.22 : 0.5;
  if (edge.from === selectedId || edge.to === selectedId) return 0.95;
  if (connected.has(edge.from) && connected.has(edge.to)) return 0.35;
  return 0.08;
}

function nodeOpacity(node, selectedId, connected) {
  if (!selectedId) return 0.95;
  return connected.has(node.id) ? 1 : 0.18;
}

function GraphSvg({ graph, selectedId, onSelect }) {
  const connected = useMemo(() => connectedNodeIds(graph, selectedId), [graph, selectedId]);
  const nodesById = useMemo(() => {
    const map = new Map();
    graph.nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [graph.nodes]);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-950 overflow-hidden">
      <svg viewBox={`0 0 ${graph.width} ${graph.height}`} className="w-full h-[620px] block" role="img" aria-label="Codebase graph lens">
        <defs>
          <radialGradient id="graphGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#334155" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width={graph.width} height={graph.height} fill="#020617" />
        <circle cx={graph.width / 2} cy={graph.height / 2} r="330" fill="url(#graphGlow)" />

        {graph.edges.map((edge) => {
          const from = nodesById.get(edge.from);
          const to = nodesById.get(edge.to);
          if (!from || !to) return null;
          return (
            <line
              key={edge.id}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={edge.color || "#64748b"}
              strokeWidth={edge.kind === "contains" ? 0.7 : 1.2}
              strokeOpacity={edgeOpacity(edge, selectedId, connected)}
              strokeDasharray={edge.dashed ? "4 5" : ""}
            />
          );
        })}

        {graph.nodes.map((node) => {
          const active = selectedId === node.id;
          const isChanged = Boolean(node.changed);
          const isRelated = Boolean(node.related);
          return (
            <g key={node.id} opacity={nodeOpacity(node, selectedId, connected)} onClick={() => onSelect(node.id)} className="cursor-pointer">
              {(active || isChanged || isRelated) && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.size + (active ? 9 : 5)}
                  fill="none"
                  stroke={active ? "#f8fafc" : isChanged ? "#f97316" : "#38bdf8"}
                  strokeWidth={active ? 2.5 : 1.8}
                  strokeOpacity="0.95"
                />
              )}
              <circle cx={node.x} cy={node.y} r={node.size} fill={node.color} stroke="#f8fafc" strokeOpacity="0.35" strokeWidth="1" />
              {node.kind === "directory" && <circle cx={node.x} cy={node.y} r={Math.max(4, node.size - 8)} fill="#020617" opacity="0.35" />}
              {(active || node.kind === "directory" || node.size > 19) && (
                <text x={node.x + node.size + 5} y={node.y + 4} fill="#e2e8f0" fontSize="12" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
                  {String(node.label || "").slice(0, 32)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function SelectedNodePanel({ graph, selectedId, symbols }) {
  const node = useMemo(() => graph.nodes.find((item) => item.id === selectedId) || graph.nodes.find((item) => item.kind !== "directory") || null, [graph.nodes, selectedId]);
  const evidence = useMemo(() => node ? relationEvidenceForNode(graph, node.id) : [], [graph, node]);
  const nodeSymbols = useMemo(() => {
    if (!node || node.node_type !== "file") return [];
    return symbols.filter((symbol) => symbol.file_path === node.path).slice(0, 12);
  }, [node, symbols]);

  if (!node) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 text-sm text-slate-500">
        Select a node to inspect file details, relation evidence, and impact radius.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">{kindLabel(node.kind)}</Badge>
          {node.changed && <Badge className="bg-orange-100 text-orange-700 border-orange-200">Changed</Badge>}
          {node.related && <Badge className="bg-sky-100 text-sky-700 border-sky-200">Related</Badge>}
        </div>
        <h2 className="font-semibold text-slate-900 mt-3 break-all">{node.path}</h2>
        <p className="text-xs text-slate-400 mt-1">Risk signal: {node.risk || "normal"}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
          <div className="text-lg font-semibold text-slate-900">{node.inbound || 0}</div>
          <div className="text-xs text-slate-500">Inbound</div>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
          <div className="text-lg font-semibold text-slate-900">{node.outbound || 0}</div>
          <div className="text-xs text-slate-500">Outbound</div>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
          <div className="text-lg font-semibold text-slate-900">{node.symbols || 0}</div>
          <div className="text-xs text-slate-500">Symbols</div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900">Impact radius</h3>
        <p className="text-sm text-slate-500 mt-1">
          Highlighted neighbors are files/directories directly connected to this node. This is the first 2D version of “what could break if I change this”.
        </p>
      </div>

      {nodeSymbols.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Symbols</h3>
          <div className="flex flex-wrap gap-1.5">
            {nodeSymbols.map((symbol) => (
              <span key={`${symbol.file_path}-${symbol.symbol_kind}-${symbol.symbol_name}`} className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-md font-mono">
                {symbol.symbol_kind}:{symbol.symbol_name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Relation evidence</h3>
        {evidence.length === 0 ? (
          <p className="text-sm text-slate-500">No direct import relation evidence for this node in the current graph sample.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-auto">
            {evidence.map((edge) => (
              <div key={edge.id} className="rounded-lg bg-slate-50 border border-slate-200 p-2 text-xs text-slate-600">
                <div className="font-mono break-all">{edge.from.replace(/^file:/, "")} → {edge.to.replace(/^file:|^external:/, "")}</div>
                <div className="mt-1 text-slate-400">{edge.kind}: {edge.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function GraphLens() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [enabledKinds, setEnabledKinds] = useState([]);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    Promise.all([
      base44.entities.CodebaseProject.filter({ id }),
      base44.entities.CodeFile.filter({ project_id: id }),
    ])
      .then(([projects, storedFiles]) => {
        setProject(projects?.[0] || null);
        setFiles(storedFiles || []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const relations = useMemo(() => buildCodeRelations(files), [files]);
  const symbols = useMemo(() => extractProjectSymbols(files), [files]);
  const missingFiles = useMemo(() => {
    const metadata = asAny(asAny(project).import_metadata);
    return asArray(metadata.missingContextQueue || metadata.missing_context_queue).map((item) => asAny(item).path || String(item || "")).filter(Boolean);
  }, [project]);

  const graph = useMemo(() => buildGraphLensData({ files, relations, symbols, missingFiles }), [files, relations, symbols, missingFiles]);
  const filteredGraph = useMemo(() => filterGraphLens(graph, { search, enabledKinds }), [graph, search, enabledKinds]);

  useEffect(() => {
    if (selectedId && !filteredGraph.nodes.some((node) => node.id === selectedId)) setSelectedId("");
  }, [filteredGraph.nodes, selectedId]);

  const toggleKind = (kind) => {
    setEnabledKinds((current) => current.includes(kind) ? current.filter((item) => item !== kind) : [...current, kind]);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <Link to={`/project/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors duration-150 cursor-pointer">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Project
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-heading text-xl font-bold text-slate-900 flex items-center gap-2">
              <Network className="w-5 h-5 text-slate-500" />
              Graph Lens
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Practical 2D codebase graph for {project?.name || "this project"}: files, folders, imports, external packages, symbols, and impact radius.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">{graph.stats.files}/{graph.stats.totalFiles} files</Badge>
            <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">{graph.stats.relations}/{graph.stats.totalRelations} relations</Badge>
            <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">{graph.stats.symbols} symbols</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
        <div className="space-y-4 min-w-0">
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search node by file path, folder, package, or kind" />
              <Button variant="outline" onClick={() => { setSearch(""); setEnabledKinds([]); }} className="cursor-pointer">Reset</Button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500"><Filter className="w-3.5 h-3.5" />Filters</span>
              {PRIMARY_KINDS.map((kind) => {
                const active = enabledKinds.includes(kind);
                const count = graph.kindCounts[kind] || 0;
                return (
                  <button
                    key={kind}
                    onClick={() => toggleKind(kind)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${active ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}
                  >
                    {kindLabel(kind)} {count}
                  </button>
                );
              })}
            </div>
          </div>

          {files.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
              No stored files are available for this project yet. Import code first, then Graph Lens can build a graph.
            </div>
          ) : (
            <GraphSvg graph={filteredGraph} selectedId={selectedId} onSelect={setSelectedId} />
          )}

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2"><Eye className="w-4 h-4" />Legend</h2>
            <div className="flex flex-wrap gap-3">
              {graph.legend.filter((item) => item.count > 0 || ["page", "component", "backend", "utility"].includes(item.kind)).map((item) => (
                <div key={item.kind} className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  {kindLabel(item.kind)} <span className="text-slate-400">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <SelectedNodePanel graph={filteredGraph} selectedId={selectedId} symbols={symbols} />

          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2"><GitBranch className="w-4 h-4" />PR impact overlay</h2>
            <p className="text-sm text-slate-500">
              v1 highlights direct impact radius for a selected node. v2 will accept a PR/diff and color changed files, related files, missing context, and verdict SAFE / REVIEW / BLOCK on top of this graph.
            </p>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-500">
              Hidden for readability: {graph.stats.hiddenFiles} files and {graph.stats.hiddenRelations} relations. The graph currently prioritizes central files, routes, backend/API files, configs, and symbol-rich files.
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2"><Sparkles className="w-4 h-4" />3D View later</h2>
            <p className="text-sm text-slate-500">
              This 2D Lens is intentionally practical. The later 3D mode can reuse the same graph data and add WebGL, force-directed layout, clustering, export, and screenshot controls.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
