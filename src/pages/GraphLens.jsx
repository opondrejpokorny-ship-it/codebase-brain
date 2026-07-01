// @ts-nocheck
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
import { optionalEntity } from "@/lib/impactAnalysisRuntimeUtils";
import { mergePrInboxItems, readLocalPrInbox } from "@/lib/prInboxStorage";
import {
  filterPrAnalysisItems,
  overlayTextFromPrAnalysis,
  prAnalysisKey,
  summarizePrAnalysisForOverlay,
  verdictFromPrAnalysis,
} from "@/lib/prAnalysisOverlayUtils";

const PRIMARY_KINDS = ["page", "component", "backend", "utility", "config", "test", "data", "integration", "external"];
const VERDICTS = ["SAFE", "REVIEW", "BLOCK"];

function asAny(value) {
  return /** @type {any} */ (value || {});
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizePath(path = "") {
  return String(path || "")
    .trim()
    .replace(/^[-*•\s]+/, "")
    .replace(/^`|`$/g, "")
    .replace(/^['\"]|['\"]$/g, "")
    .replace(/^[ab]\//, "")
    .replace(/^\.\//, "")
    .replace(/\/+/g, "/");
}

function readInitialPrKey() {
  try {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("pr") || "";
  } catch {
    return "";
  }
}

function looksLikePath(value = "") {
  const path = normalizePath(value);
  return path.includes("/") && /\.[a-z0-9]{1,8}$/i.test(path) && !path.includes(" ");
}

function parseChangedFiles(value = "") {
  const paths = [];
  String(value || "").split("\n").forEach((line) => {
    const raw = line.trim();
    if (!raw) return;

    const diffMatch = raw.match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (diffMatch?.[2] && diffMatch[2] !== "/dev/null") paths.push(diffMatch[2]);

    const plusMatch = raw.match(/^\+\+\+ b\/(.+)$/);
    if (plusMatch?.[1] && plusMatch[1] !== "/dev/null") paths.push(plusMatch[1]);

    const minusMatch = raw.match(/^--- a\/(.+)$/);
    if (minusMatch?.[1] && minusMatch[1] !== "/dev/null") paths.push(minusMatch[1]);

    const statusMatch = raw.match(/^(?:modified|added|deleted|renamed|changed|file):\s+(.+)$/i);
    if (statusMatch?.[1]) paths.push(statusMatch[1]);

    const tableMatch = raw.match(/^\|\s*([^|]+\.[a-z0-9]{1,8})\s*\|/i);
    if (tableMatch?.[1]) paths.push(tableMatch[1]);

    if (looksLikePath(raw)) paths.push(raw);
  });

  return [...new Set(paths.map(normalizePath).filter(looksLikePath))].slice(0, 80);
}

function deriveRelatedFiles(changedFiles = [], relations = [], knownPaths = new Set()) {
  const changed = new Set(changedFiles.map(normalizePath));
  const related = new Set();
  relations.forEach((relation) => {
    const safeRelation = asAny(relation);
    const from = normalizePath(safeRelation.from_file);
    const to = normalizePath(safeRelation.to_file);
    if (changed.has(from) && to && knownPaths.has(to)) related.add(to);
    if (changed.has(to) && from && knownPaths.has(from)) related.add(from);
  });
  changed.forEach((path) => related.delete(path));
  return [...related].slice(0, 120);
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

function verdictClasses(verdict = "REVIEW") {
  const classes = /** @type {Record<string, string>} */ ({
    SAFE: "bg-emerald-100 text-emerald-700 border-emerald-200",
    REVIEW: "bg-amber-100 text-amber-700 border-amber-200",
    BLOCK: "bg-red-100 text-red-700 border-red-200",
  });
  return classes[verdict] || classes.REVIEW;
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

function overlayStroke(node, active) {
  if (active) return "#f8fafc";
  if (node.changed) return "#f97316";
  if (node.related) return "#38bdf8";
  if (node.missing) return "#94a3b8";
  return "#f8fafc";
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
          const hasOverlay = Boolean(node.changed || node.related || node.missing);
          return (
            <g key={node.id} opacity={nodeOpacity(node, selectedId, connected)} onClick={() => onSelect(node.id)} className="cursor-pointer">
              {(active || hasOverlay) && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.size + (active ? 9 : 5)}
                  fill="none"
                  stroke={overlayStroke(node, active)}
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
          {node.missing && <Badge className="bg-slate-100 text-slate-600 border-slate-200">Missing context</Badge>}
        </div>
        <h2 className="font-semibold text-slate-900 mt-3 break-all">{node.path}</h2>
        <p className="text-xs text-slate-400 mt-1">Risk signal: {node.risk || "normal"}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><div className="text-lg font-semibold text-slate-900">{node.inbound || 0}</div><div className="text-xs text-slate-500">Inbound</div></div>
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><div className="text-lg font-semibold text-slate-900">{node.outbound || 0}</div><div className="text-xs text-slate-500">Outbound</div></div>
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><div className="text-lg font-semibold text-slate-900">{node.symbols || 0}</div><div className="text-xs text-slate-500">Symbols</div></div>
      </div>

      <div><h3 className="text-sm font-semibold text-slate-900">Impact radius</h3><p className="text-sm text-slate-500 mt-1">Highlighted neighbors are files/directories directly connected to this node. In PR overlay mode, orange means changed and blue means directly related.</p></div>

      {nodeSymbols.length > 0 && (
        <div><h3 className="text-sm font-semibold text-slate-900 mb-2">Symbols</h3><div className="flex flex-wrap gap-1.5">
          {nodeSymbols.map((symbol) => <span key={`${symbol.file_path}-${symbol.symbol_kind}-${symbol.symbol_name}`} className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-md font-mono">{symbol.symbol_kind}:{symbol.symbol_name}</span>)}
        </div></div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Relation evidence</h3>
        {evidence.length === 0 ? <p className="text-sm text-slate-500">No direct import relation evidence for this node in the current graph sample.</p> : (
          <div className="space-y-2 max-h-72 overflow-auto">
            {evidence.map((edge) => <div key={edge.id} className="rounded-lg bg-slate-50 border border-slate-200 p-2 text-xs text-slate-600"><div className="font-mono break-all">{edge.from.replace(/^file:/, "")} → {edge.to.replace(/^file:|^external:/, "")}</div><div className="mt-1 text-slate-400">{edge.kind}: {edge.label}</div></div>)}
          </div>
        )}
      </div>
    </div>
  );
}

function PrOverlayPanel({ overlayInput, setOverlayInput, overlayVerdict, setOverlayVerdict, changedFiles, relatedFiles, missingFiles, prItems, selectedPrItemKey, onSelectPrItem, loadingPrItems }) {
  const hasOverlay = changedFiles.length > 0;
  const selectedSummary = useMemo(() => {
    const selected = prItems.find((item) => prAnalysisKey(item) === selectedPrItemKey);
    return selected ? summarizePrAnalysisForOverlay(selected) : null;
  }, [prItems, selectedPrItemKey]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-900 flex items-center gap-2"><GitBranch className="w-4 h-4" />PR impact overlay</h2><p className="text-sm text-slate-500 mt-1">Load a saved PR Inbox analysis or paste changed paths/diff manually.</p></div><Badge className={verdictClasses(overlayVerdict)}>{overlayVerdict}</Badge></div>

      <label className="block text-sm text-slate-600 space-y-1"><span>Saved PR analysis</span><select value={selectedPrItemKey} onChange={(event) => onSelectPrItem(event.target.value)} disabled={loadingPrItems || prItems.length === 0} className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white"><option value="">{loadingPrItems ? "Loading saved PR analyses..." : prItems.length ? "Manual paste / no saved PR selected" : "No saved PR analyses yet"}</option>{prItems.map((item) => { const summary = summarizePrAnalysisForOverlay(item); return <option key={summary.key} value={summary.key}>{summary.label} · {summary.verdict} · {summary.title}</option>; })}</select></label>

      {selectedSummary && <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">Loaded from PR Inbox: {selectedSummary.label} · {selectedSummary.risk} risk · {selectedSummary.changedFiles || changedFiles.length} changed files{selectedSummary.url && <a href={selectedSummary.url} target="_blank" rel="noreferrer" className="block underline mt-1">Open PR</a>}</div>}

      <div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-orange-50 border border-orange-200 p-3"><div className="text-lg font-semibold text-orange-700">{changedFiles.length}</div><div className="text-xs text-orange-700">Changed</div></div><div className="rounded-lg bg-sky-50 border border-sky-200 p-3"><div className="text-lg font-semibold text-sky-700">{relatedFiles.length}</div><div className="text-xs text-sky-700">Related</div></div><div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><div className="text-lg font-semibold text-slate-700">{missingFiles.length}</div><div className="text-xs text-slate-500">Missing</div></div></div>

      <label className="block text-sm text-slate-600 space-y-1"><span>Verdict</span><select value={overlayVerdict} onChange={(event) => setOverlayVerdict(event.target.value)} className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white">{VERDICTS.map((verdict) => <option key={verdict} value={verdict}>{verdict}</option>)}</select></label>
      <textarea value={overlayInput} onChange={(event) => setOverlayInput(event.target.value)} placeholder={"Paste changed files or diff, e.g.\nsrc/pages/GraphLens.jsx\nsrc/lib/graphLensUtils.js\n\nor lines like: diff --git a/src/App.jsx b/src/App.jsx"} className="w-full min-h-40 rounded-md border border-slate-200 p-3 text-xs font-mono" />
      <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setOverlayInput("src/pages/GraphLens.jsx\nsrc/lib/graphLensUtils.js")} className="cursor-pointer">Use sample</Button><Button variant="outline" size="sm" onClick={() => { setOverlayInput(""); onSelectPrItem(""); }} className="cursor-pointer">Clear overlay</Button></div>

      {hasOverlay ? <div className="space-y-3"><div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">Orange = changed files. Blue = directly connected files from import relations. Gray missing list = changed files not present in stored context.</div>{missingFiles.length > 0 && <div><h3 className="text-sm font-semibold text-slate-900 mb-2">Missing context</h3><div className="space-y-1 max-h-32 overflow-auto">{missingFiles.slice(0, 12).map((path) => <div key={path} className="text-xs font-mono text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2 py-1">{path}</div>)}</div></div>}</div> : <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-500">No PR overlay is active yet. Select a saved PR analysis or paste changed files to preview blast radius before merge.</div>}
    </div>
  );
}

export default function GraphLens() {
  const { id } = useParams();
  const initialPrKey = useMemo(() => readInitialPrKey(), [id]);
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [prItems, setPrItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPrItems, setLoadingPrItems] = useState(true);
  const [search, setSearch] = useState("");
  const [enabledKinds, setEnabledKinds] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [overlayInput, setOverlayInputState] = useState("");
  const [overlayVerdict, setOverlayVerdict] = useState("REVIEW");
  const [selectedPrItemKey, setSelectedPrItemKey] = useState("");

  const setOverlayInput = (value) => {
    setOverlayInputState(value);
    if (selectedPrItemKey) setSelectedPrItemKey("");
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadingPrItems(true);
    const analysisEntity = optionalEntity("CodebaseAnalysis");
    Promise.all([
      base44.entities.CodebaseProject.filter({ id }),
      base44.entities.CodeFile.filter({ project_id: id }),
      analysisEntity?.filter ? analysisEntity.filter({ project_id: id }, "created_date", 80).catch(() => []) : Promise.resolve([]),
    ]).then(([projects, storedFiles, remoteItems]) => {
      if (cancelled) return;
      setProject(projects?.[0] || null);
      setFiles(storedFiles || []);
      setPrItems(filterPrAnalysisItems(mergePrInboxItems(remoteItems || [], readLocalPrInbox(id))));
    }).finally(() => {
      if (cancelled) return;
      setLoading(false);
      setLoadingPrItems(false);
    });
    return () => { cancelled = true; };
  }, [id]);

  const relations = useMemo(() => buildCodeRelations(files), [files]);
  const symbols = useMemo(() => extractProjectSymbols(files), [files]);
  const knownPaths = useMemo(() => new Set(files.map((file) => normalizePath(file.path)).filter(Boolean)), [files]);
  const missingFiles = useMemo(() => { const metadata = asAny(asAny(project).import_metadata); return asArray(metadata.missingContextQueue || metadata.missing_context_queue).map((item) => asAny(item).path || String(item || "")).map(normalizePath).filter(Boolean); }, [project]);
  const overlayChangedFiles = useMemo(() => parseChangedFiles(overlayInput), [overlayInput]);
  const overlayRelatedFiles = useMemo(() => deriveRelatedFiles(overlayChangedFiles, relations, knownPaths), [overlayChangedFiles, relations, knownPaths]);
  const overlayMissingFiles = useMemo(() => overlayChangedFiles.filter((path) => !knownPaths.has(path)), [overlayChangedFiles, knownPaths]);
  const effectiveMissingFiles = useMemo(() => [...new Set([...missingFiles, ...overlayMissingFiles])], [missingFiles, overlayMissingFiles]);

  const graph = useMemo(() => buildGraphLensData({ files, relations, symbols, missingFiles: effectiveMissingFiles, changedFiles: overlayChangedFiles, relatedFiles: overlayRelatedFiles }), [files, relations, symbols, effectiveMissingFiles, overlayChangedFiles, overlayRelatedFiles]);
  const filteredGraph = useMemo(() => filterGraphLens(graph, { search, enabledKinds }), [graph, search, enabledKinds]);

  useEffect(() => { if (selectedId && !filteredGraph.nodes.some((node) => node.id === selectedId)) setSelectedId(""); }, [filteredGraph.nodes, selectedId]);

  const toggleKind = (kind) => { setEnabledKinds((current) => current.includes(kind) ? current.filter((item) => item !== kind) : [...current, kind]); };

  const selectPrItem = (key) => {
    setSelectedPrItemKey(key);
    if (!key) return;
    const item = prItems.find((candidate) => prAnalysisKey(candidate) === key);
    if (!item) return;
    setOverlayInputState(overlayTextFromPrAnalysis(item));
    setOverlayVerdict(verdictFromPrAnalysis(item));
  };

  useEffect(() => {
    if (!initialPrKey || loadingPrItems || selectedPrItemKey || prItems.length === 0) return;
    const decodedKey = decodeURIComponent(initialPrKey);
    const match = prItems.find((item) => prAnalysisKey(item) === decodedKey);
    if (match) selectPrItem(prAnalysisKey(match));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrKey, loadingPrItems, selectedPrItemKey, prItems]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6">
      <Link to={`/project/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors duration-150 cursor-pointer"><ArrowLeft className="w-3.5 h-3.5" />Back to Project</Link>
      <div className="bg-white rounded-xl border border-slate-200 p-6"><div className="flex items-start justify-between gap-4 flex-wrap"><div><h1 className="font-heading text-xl font-bold text-slate-900 flex items-center gap-2"><Network className="w-5 h-5 text-slate-500" />Graph Lens</h1><p className="text-sm text-slate-500 mt-1">Practical 2D codebase graph for {project?.name || "this project"}: files, folders, imports, external packages, symbols, PR overlay, and impact radius.</p></div><div className="flex gap-2 flex-wrap">{overlayChangedFiles.length > 0 && <Badge className={verdictClasses(overlayVerdict)}>Overlay {overlayVerdict}</Badge>}<Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">{prItems.length} saved PRs</Badge><Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">{graph.stats.files}/{graph.stats.totalFiles} files</Badge><Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">{graph.stats.relations}/{graph.stats.totalRelations} relations</Badge><Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">{graph.stats.symbols} symbols</Badge></div></div></div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5"><div className="space-y-4 min-w-0"><div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3"><div className="flex items-center gap-2"><Search className="w-4 h-4 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search node by file path, folder, package, or kind" /><Button variant="outline" onClick={() => { setSearch(""); setEnabledKinds([]); }} className="cursor-pointer">Reset</Button></div><div className="flex items-center gap-2 flex-wrap"><span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500"><Filter className="w-3.5 h-3.5" />Filters</span>{PRIMARY_KINDS.map((kind) => { const active = enabledKinds.includes(kind); const count = graph.kindCounts[kind] || 0; return <button key={kind} onClick={() => toggleKind(kind)} className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${active ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}>{kindLabel(kind)} {count}</button>; })}</div></div>
        {files.length === 0 ? <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">No stored files are available for this project yet. Import code first, then Graph Lens can build a graph.</div> : <GraphSvg graph={filteredGraph} selectedId={selectedId} onSelect={setSelectedId} />}
        <div className="bg-white rounded-xl border border-slate-200 p-4"><h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2"><Eye className="w-4 h-4" />Legend</h2><div className="flex flex-wrap gap-3"><div className="flex items-center gap-2 text-xs text-slate-600"><span className="w-3 h-3 rounded-full border-2 border-orange-500" />Changed</div><div className="flex items-center gap-2 text-xs text-slate-600"><span className="w-3 h-3 rounded-full border-2 border-sky-400" />Related</div><div className="flex items-center gap-2 text-xs text-slate-600"><span className="w-3 h-3 rounded-full border-2 border-slate-400" />Missing context</div>{graph.legend.filter((item) => item.count > 0 || ["page", "component", "backend", "utility"].includes(item.kind)).map((item) => <div key={item.kind} className="flex items-center gap-2 text-xs text-slate-600"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />{kindLabel(item.kind)} <span className="text-slate-400">{item.count}</span></div>)}</div></div></div>
        <div className="space-y-4"><SelectedNodePanel graph={filteredGraph} selectedId={selectedId} symbols={symbols} /><PrOverlayPanel overlayInput={overlayInput} setOverlayInput={setOverlayInput} overlayVerdict={overlayVerdict} setOverlayVerdict={setOverlayVerdict} changedFiles={overlayChangedFiles} relatedFiles={overlayRelatedFiles} missingFiles={overlayMissingFiles} prItems={prItems} selectedPrItemKey={selectedPrItemKey} onSelectPrItem={selectPrItem} loadingPrItems={loadingPrItems} />
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3"><h2 className="font-semibold text-slate-900 flex items-center gap-2"><Sparkles className="w-4 h-4" />3D View later</h2><p className="text-sm text-slate-500">This 2D Lens is intentionally practical. The later 3D mode can reuse the same graph data and add WebGL, force-directed layout, clustering, export, and screenshot controls.</p><div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-500">Hidden for readability: {graph.stats.hiddenFiles} files and {graph.stats.hiddenRelations} relations. The graph prioritizes central files, routes, backend/API files, configs, and symbol-rich files.</div></div></div></div>
    </div>
  );
}
