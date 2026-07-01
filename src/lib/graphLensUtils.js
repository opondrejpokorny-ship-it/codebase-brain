function asAny(value) {
  return /** @type {any} */ (value || {});
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizePath(path = "") {
  return String(path || "").replace(/^\.\//, "").replace(/\/+/g, "/");
}

function dirname(path = "") {
  const normalized = normalizePath(path);
  const parts = normalized.split("/").filter(Boolean);
  parts.pop();
  return parts.join("/") || "root";
}

function topFolder(path = "") {
  return normalizePath(path).split("/").filter(Boolean)[0] || "root";
}

function extension(path = "") {
  const match = normalizePath(path).match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : "";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function symbolKindsForFile(symbols = [], path = "") {
  const wanted = normalizePath(path);
  return new Set(symbols.filter((symbol) => normalizePath(symbol.file_path) === wanted).map((symbol) => symbol.symbol_kind));
}

function inferFileKind(file = {}, symbols = []) {
  const path = normalizePath(asAny(file).path);
  const kinds = symbolKindsForFile(symbols, path);
  if (/(__tests__|\.(test|spec)\.|\/tests?\/|\/specs?\/)/i.test(path)) return "test";
  if (/\.(json|ya?ml|toml|env|config\.[jt]s|config\.mjs)$/i.test(path) || /(^|\/)(package-lock|package|vite|next|tsconfig|jsconfig|tailwind|postcss)/i.test(path)) return "config";
  if (/src\/pages|app\/|pages\/|routes?\//i.test(path)) return "page";
  if (kinds.has("backend_function") || /base44\/functions|functions\/|api\/|server\/|webhook/i.test(path)) return "backend";
  if (kinds.has("component") || /components?\//i.test(path) || /\.(jsx|tsx)$/i.test(path)) return "component";
  if (/entities|schema|model|db|database|prisma|sql/i.test(path)) return "data";
  if (/integration|github|openai|stripe|comgate|webhook|api-client/i.test(path)) return "integration";
  if (/utils?|lib|helpers?|hooks?|services?\//i.test(path) || kinds.has("hook") || kinds.has("service")) return "utility";
  return "file";
}

function nodeColor(kind = "file") {
  const colors = /** @type {Record<string, string>} */ ({
    directory: "#64748b",
    page: "#2563eb",
    component: "#7c3aed",
    backend: "#dc2626",
    utility: "#059669",
    config: "#ca8a04",
    test: "#9333ea",
    data: "#0891b2",
    integration: "#ea580c",
    external: "#0f172a",
    unresolved: "#94a3b8",
    file: "#475569",
  });
  return colors[kind] || colors.file;
}

function relationKey(relation = {}) {
  const safeRelation = asAny(relation);
  return `${safeRelation.from_file || ""}|${safeRelation.relation_type || ""}|${safeRelation.to_file || safeRelation.import_path || ""}`;
}

function scoreFile(path = "", inbound = 0, outbound = 0, symbols = 0) {
  const lower = normalizePath(path).toLowerCase();
  let score = inbound * 3 + outbound * 2 + symbols;
  if (/src\/pages|app\/|routes?\//.test(lower)) score += 4;
  if (/api|server|functions|webhook|auth|payment|billing/.test(lower)) score += 5;
  if (/package|config|schema|entities|model/.test(lower)) score += 3;
  return score;
}

function buildDegreeMaps(relations = []) {
  const inbound = new Map();
  const outbound = new Map();
  for (const relation of relations) {
    const safeRelation = asAny(relation);
    const from = normalizePath(safeRelation.from_file);
    const to = normalizePath(safeRelation.to_file);
    if (from) outbound.set(from, (outbound.get(from) || 0) + 1);
    if (to) inbound.set(to, (inbound.get(to) || 0) + 1);
  }
  return { inbound, outbound };
}

function positionNode(index, total, radius, centerX, centerY, offset = 0) {
  const angle = ((index / Math.max(total, 1)) * Math.PI * 2) + offset;
  return {
    x: Math.round(centerX + Math.cos(angle) * radius),
    y: Math.round(centerY + Math.sin(angle) * radius),
  };
}

function visibleFileCandidates(files = [], relations = [], symbols = [], limit = 160) {
  const { inbound, outbound } = buildDegreeMaps(relations);
  const symbolCounts = symbols.reduce((map, symbol) => {
    const path = normalizePath(symbol.file_path);
    map.set(path, (map.get(path) || 0) + 1);
    return map;
  }, new Map());

  return files
    .map((file) => {
      const safeFile = asAny(file);
      const path = normalizePath(safeFile.path);
      return {
        file,
        path,
        score: scoreFile(path, inbound.get(path) || 0, outbound.get(path) || 0, symbolCounts.get(path) || 0),
      };
    })
    .filter((item) => item.path)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, limit);
}

export function buildGraphLensData(input = {}) {
  const safeInput = asAny(input);
  const files = asArray(safeInput.files);
  const relations = asArray(safeInput.relations);
  const symbols = asArray(safeInput.symbols);
  const changedFiles = new Set(asArray(safeInput.changedFiles).map(normalizePath));
  const relatedFiles = new Set(asArray(safeInput.relatedFiles).map(normalizePath));
  const missingFiles = new Set(asArray(safeInput.missingFiles).map(normalizePath));
  const maxFiles = Number(safeInput.maxFiles || 160);
  const maxRelations = Number(safeInput.maxRelations || 420);
  const selectedFiles = visibleFileCandidates(files, relations, symbols, maxFiles);
  const selectedPaths = new Set(selectedFiles.map((item) => item.path));
  const { inbound, outbound } = buildDegreeMaps(relations);
  const symbolCounts = symbols.reduce((map, symbol) => {
    const path = normalizePath(symbol.file_path);
    map.set(path, (map.get(path) || 0) + 1);
    return map;
  }, new Map());

  const directoryNames = [...new Set(selectedFiles.map((item) => topFolder(item.path)))].sort();
  const directoryPositions = new Map();
  const width = 1200;
  const height = 760;
  const centerX = 600;
  const centerY = 380;

  directoryNames.forEach((name, index) => {
    directoryPositions.set(name, positionNode(index, directoryNames.length, 260, centerX, centerY, -Math.PI / 2));
  });

  const nodes = [];
  directoryNames.forEach((name, index) => {
    const pos = directoryPositions.get(name) || positionNode(index, directoryNames.length, 260, centerX, centerY);
    const childCount = selectedFiles.filter((item) => topFolder(item.path) === name).length;
    nodes.push({
      id: `dir:${name}`,
      label: name,
      path: name,
      kind: "directory",
      node_type: "directory",
      color: nodeColor("directory"),
      size: clamp(14 + childCount * 1.4, 16, 38),
      x: pos.x,
      y: pos.y,
      inbound: 0,
      outbound: childCount,
      symbols: 0,
      folder: name,
      risk: childCount > 20 ? "large cluster" : "normal",
    });
  });

  const filesByFolder = selectedFiles.reduce((map, item) => {
    const folder = topFolder(item.path);
    if (!map.has(folder)) map.set(folder, []);
    map.get(folder).push(item);
    return map;
  }, new Map());

  for (const [folder, items] of filesByFolder.entries()) {
    const folderCenter = directoryPositions.get(folder) || { x: centerX, y: centerY };
    items.forEach((item, index) => {
      const kind = inferFileKind(item.file, symbols);
      const inCount = inbound.get(item.path) || 0;
      const outCount = outbound.get(item.path) || 0;
      const symbolCount = symbolCounts.get(item.path) || 0;
      const pos = positionNode(index, items.length, clamp(52 + items.length * 3, 72, 160), folderCenter.x, folderCenter.y, (folder.length % 8) * 0.25);
      nodes.push({
        id: `file:${item.path}`,
        label: item.path.split("/").pop() || item.path,
        path: item.path,
        kind,
        node_type: "file",
        color: nodeColor(kind),
        size: clamp(7 + inCount * 1.2 + outCount * 0.8 + symbolCount * 0.45, 8, 28),
        x: pos.x,
        y: pos.y,
        inbound: inCount,
        outbound: outCount,
        symbols: symbolCount,
        folder,
        parent: `dir:${folder}`,
        changed: changedFiles.has(item.path),
        related: relatedFiles.has(item.path),
        missing: missingFiles.has(item.path),
        risk: inCount + outCount > 12 ? "high fanout" : inCount > 6 ? "important dependency" : "normal",
      });
    });
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = [];
  selectedFiles.forEach((item) => {
    const folder = topFolder(item.path);
    edges.push({
      id: `contains:${folder}:${item.path}`,
      from: `dir:${folder}`,
      to: `file:${item.path}`,
      kind: "contains",
      label: "contains",
      color: "#cbd5e1",
      dashed: true,
    });
  });

  const seenRelations = new Set();
  for (const relation of relations) {
    const safeRelation = asAny(relation);
    const key = relationKey(relation);
    if (seenRelations.has(key)) continue;
    seenRelations.add(key);
    const fromPath = normalizePath(safeRelation.from_file);
    const toPath = normalizePath(safeRelation.to_file);
    const from = `file:${fromPath}`;
    const to = `file:${toPath}`;
    if (nodeIds.has(from) && nodeIds.has(to)) {
      edges.push({
        id: `rel:${key}`,
        from,
        to,
        kind: safeRelation.relation_type || "imports",
        label: safeRelation.import_path || safeRelation.relation_type || "imports",
        color: safeRelation.resolved === false ? "#94a3b8" : "#64748b",
        dashed: safeRelation.resolved === false,
      });
    } else if (selectedPaths.has(fromPath) && !safeRelation.to_file && safeRelation.target_kind === "external_package") {
      const pkg = safeRelation.package_name || safeRelation.import_path || "external";
      const externalId = `external:${pkg}`;
      if (!nodeIds.has(externalId)) {
        const pos = positionNode(nodeIds.size, Math.max(nodeIds.size, 1), 342, centerX, centerY, Math.PI / 6);
        nodes.push({ id: externalId, label: pkg, path: pkg, kind: "external", node_type: "external", color: nodeColor("external"), size: 9, x: pos.x, y: pos.y, inbound: 1, outbound: 0, symbols: 0, folder: "external", risk: "external package" });
        nodeIds.add(externalId);
      }
      edges.push({ id: `external:${key}`, from, to: externalId, kind: "external_package", label: pkg, color: "#94a3b8", dashed: true });
    }
    if (edges.length >= maxRelations) break;
  }

  const kindCounts = nodes.reduce((acc, node) => {
    acc[node.kind] = (acc[node.kind] || 0) + 1;
    return acc;
  }, /** @type {Record<string, number>} */ ({}));

  return {
    width,
    height,
    nodes,
    edges,
    kindCounts,
    stats: {
      files: selectedFiles.length,
      totalFiles: files.length,
      directories: directoryNames.length,
      relations: edges.filter((edge) => edge.kind !== "contains").length,
      totalRelations: relations.length,
      symbols: symbols.length,
      hiddenFiles: Math.max(0, files.length - selectedFiles.length),
      hiddenRelations: Math.max(0, relations.length - edges.filter((edge) => edge.kind !== "contains").length),
    },
    legend: ["directory", "page", "component", "backend", "utility", "config", "test", "data", "integration", "external", "file"].map((kind) => ({ kind, color: nodeColor(kind), count: kindCounts[kind] || 0 })),
  };
}

export function connectedNodeIds(graph = {}, selectedNodeId = "") {
  if (!selectedNodeId) return new Set();
  const safeGraph = asAny(graph);
  const ids = new Set([selectedNodeId]);
  asArray(safeGraph.edges).forEach((edge) => {
    if (edge.from === selectedNodeId) ids.add(edge.to);
    if (edge.to === selectedNodeId) ids.add(edge.from);
  });
  return ids;
}

export function relationEvidenceForNode(graph = {}, selectedNodeId = "") {
  const safeGraph = asAny(graph);
  if (!selectedNodeId) return [];
  return asArray(safeGraph.edges)
    .filter((edge) => edge.from === selectedNodeId || edge.to === selectedNodeId)
    .filter((edge) => edge.kind !== "contains")
    .slice(0, 30);
}

export function filterGraphLens(graph = {}, filters = {}) {
  const safeGraph = asAny(graph);
  const safeFilters = asAny(filters);
  const search = String(safeFilters.search || "").toLowerCase().trim();
  const enabledKinds = new Set(asArray(safeFilters.enabledKinds));
  const hasKindFilter = enabledKinds.size > 0;
  const nodes = asArray(safeGraph.nodes).filter((node) => {
    const safeNode = asAny(node);
    const matchesSearch = !search || String(`${safeNode.path} ${safeNode.label} ${safeNode.kind}`).toLowerCase().includes(search);
    const matchesKind = !hasKindFilter || enabledKinds.has(safeNode.kind);
    return matchesSearch && matchesKind;
  });
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = asArray(safeGraph.edges).filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to));
  return { ...safeGraph, nodes, edges };
}
