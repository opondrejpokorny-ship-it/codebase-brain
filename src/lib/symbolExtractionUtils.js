function lines(content = "") {
  return String(content || "").split("\n");
}

function lineNumberForIndex(content = "", index = 0) {
  return String(content || "").slice(0, index).split("\n").length;
}

function confidenceFor(kind) {
  if (["component", "api_route", "backend_function"].includes(kind)) return 0.85;
  if (["function", "class", "hook", "service"].includes(kind)) return 0.8;
  return 0.65;
}

function pushMatches({ content, filePath, pattern, kind, exportType = null, symbols }) {
  let match;
  while ((match = pattern.exec(content))) {
    const name = match[1] || match[2] || "anonymous";
    const line = lineNumberForIndex(content, match.index);
    const signature = match[0].split("\n")[0].slice(0, 240);
    symbols.push({
      file_path: filePath,
      symbol_name: name,
      symbol_kind: kind,
      signature,
      line_start: line,
      line_end: line,
      export_type: exportType || (match[0].startsWith("export default") ? "default" : match[0].startsWith("export") ? "named" : null),
      confidence: confidenceFor(kind),
    });
  }
}

function inferKindFromName(name = "", fallback = "function") {
  if (/^use[A-Z]/.test(name)) return "hook";
  if (/^[A-Z]/.test(name)) return "component";
  if (/service$/i.test(name)) return "service";
  return fallback;
}

export function extractSymbolsFromFile(file = {}) {
  const filePath = file.path || "";
  const content = String(file.content || "");
  if (!filePath || !content) return [];

  const symbols = [];
  const isJsLike = /\.(js|jsx|ts|tsx|mjs|cjs)$/i.test(filePath);
  const isPython = /\.py$/i.test(filePath);
  const isPhp = /\.php$/i.test(filePath);
  const isGo = /\.go$/i.test(filePath);

  if (isJsLike) {
    pushMatches({ content, filePath, pattern: /export\s+default\s+function\s+([A-Za-z0-9_$]+)/g, kind: "function", exportType: "default", symbols });
    pushMatches({ content, filePath, pattern: /export\s+function\s+([A-Za-z0-9_$]+)\s*\(/g, kind: "function", exportType: "named", symbols });
    pushMatches({ content, filePath, pattern: /function\s+([A-Za-z0-9_$]+)\s*\(/g, kind: "function", symbols });
    pushMatches({ content, filePath, pattern: /class\s+([A-Za-z0-9_$]+)/g, kind: "class", symbols });
    pushMatches({ content, filePath, pattern: /export\s+const\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\(/g, kind: "function", exportType: "named", symbols });
    pushMatches({ content, filePath, pattern: /const\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\(/g, kind: "function", symbols });
    pushMatches({ content, filePath, pattern: /export\s+const\s+([A-Za-z0-9_$]+)\s*=/g, kind: "constant", exportType: "named", symbols });

    if (/base44\/functions\/[^/]+\/entry\.(ts|js)$/i.test(filePath) || /Deno\.serve/.test(content)) {
      symbols.push({ file_path: filePath, symbol_name: filePath.split("/").slice(-2, -1)[0] || "base44_function", symbol_kind: "backend_function", signature: "Base44/Deno backend function", line_start: 1, line_end: 1, export_type: null, confidence: 0.9 });
    }

    if (/app\.(get|post|put|delete|patch)\s*\(/.test(content) || /router\.(get|post|put|delete|patch)\s*\(/.test(content)) {
      symbols.push({ file_path: filePath, symbol_name: "api_routes", symbol_kind: "api_route", signature: "Express/router style API routes", line_start: 1, line_end: 1, export_type: null, confidence: 0.75 });
    }
  }

  if (isPython) {
    pushMatches({ content, filePath, pattern: /def\s+([A-Za-z0-9_]+)\s*\(/g, kind: "function", symbols });
    pushMatches({ content, filePath, pattern: /class\s+([A-Za-z0-9_]+)/g, kind: "class", symbols });
  }

  if (isPhp) {
    pushMatches({ content, filePath, pattern: /function\s+([A-Za-z0-9_]+)\s*\(/g, kind: "function", symbols });
    pushMatches({ content, filePath, pattern: /class\s+([A-Za-z0-9_]+)/g, kind: "class", symbols });
  }

  if (isGo) {
    pushMatches({ content, filePath, pattern: /func\s+(?:\([^)]*\)\s*)?([A-Za-z0-9_]+)\s*\(/g, kind: "function", symbols });
    pushMatches({ content, filePath, pattern: /type\s+([A-Za-z0-9_]+)\s+struct/g, kind: "class", symbols });
  }

  return symbols.map((symbol) => ({
    ...symbol,
    symbol_kind: inferKindFromName(symbol.symbol_name, symbol.symbol_kind),
  })).filter((symbol, index, all) => (
    all.findIndex((item) => item.file_path === symbol.file_path && item.symbol_name === symbol.symbol_name && item.symbol_kind === symbol.symbol_kind) === index
  )).slice(0, 120);
}

export function extractProjectSymbols(files = []) {
  return files.flatMap(extractSymbolsFromFile);
}

export function summarizeSymbols(symbols = []) {
  const byKind = symbols.reduce((acc, symbol) => {
    acc[symbol.symbol_kind] = (acc[symbol.symbol_kind] || 0) + 1;
    return acc;
  }, {});

  const topFiles = [...symbols.reduce((map, symbol) => {
    map.set(symbol.file_path, (map.get(symbol.file_path) || 0) + 1);
    return map;
  }, new Map()).entries()]
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalSymbols: symbols.length,
    byKind,
    topFiles,
  };
}

export function buildSymbolIndexPreview(files = []) {
  const symbols = extractProjectSymbols(files);
  const summary = summarizeSymbols(symbols);
  return {
    symbol_records: symbols.length,
    kind_counts: summary.byKind,
    top_symbol_files: summary.topFiles,
    sample_records: symbols.slice(0, 25),
  };
}
