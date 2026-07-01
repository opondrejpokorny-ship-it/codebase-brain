const SYMBOL_PATTERNS = [
  { type: "function", regex: /\bexport\s+async\s+function\s+([A-Za-z_$][\w$]*)\s*\(/g, exported: true },
  { type: "function", regex: /\bexport\s+function\s+([A-Za-z_$][\w$]*)\s*\(/g, exported: true },
  { type: "function", regex: /\basync\s+function\s+([A-Za-z_$][\w$]*)\s*\(/g, exported: false },
  { type: "function", regex: /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g, exported: false },
  { type: "class", regex: /\bexport\s+class\s+([A-Za-z_$][\w$]*)\b/g, exported: true },
  { type: "class", regex: /\bclass\s+([A-Za-z_$][\w$]*)\b/g, exported: false },
  { type: "const", regex: /\bexport\s+const\s+([A-Za-z_$][\w$]*)\s*=/g, exported: true },
  { type: "const", regex: /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(?[^=]*?\)?\s*=>/g, exported: false },
  { type: "hook", regex: /\bexport\s+function\s+(use[A-Z][A-Za-z0-9_$]*)\s*\(/g, exported: true },
  { type: "hook", regex: /\bfunction\s+(use[A-Z][A-Za-z0-9_$]*)\s*\(/g, exported: false },
  { type: "python_function", regex: /^\s*def\s+([A-Za-z_][\w]*)\s*\(/gm, exported: false },
  { type: "python_class", regex: /^\s*class\s+([A-Za-z_][\w]*)\s*[(:]/gm, exported: false },
];

function lineForIndex(content, index) {
  return String(content || "").slice(0, index).split(/\r?\n/).length;
}

function symbolKind(name = "", rawType = "") {
  if (/^use[A-Z]/.test(name)) return "hook";
  if (/^[A-Z]/.test(name) && ["function", "const"].includes(rawType)) return "component";
  if (rawType === "python_function") return "function";
  if (rawType === "python_class") return "class";
  return rawType;
}

function addSymbol(symbols, seen, file, match, pattern) {
  const name = match?.[1];
  if (!name) return;
  const kind = symbolKind(name, pattern.type);
  const key = `${file.path}|${name}|${kind}|${match.index}`;
  if (seen.has(key)) return;
  seen.add(key);
  symbols.push({
    name,
    type: kind,
    rawType: pattern.type,
    path: file.path || "",
    exported: Boolean(pattern.exported || /\bexport\s+(default\s+)?/.test(match[0] || "")),
    line: lineForIndex(file.content || "", match.index || 0),
  });
}

export function extractSymbolsFromFile(file = {}) {
  const content = String(file.content || "");
  if (!content || content.length > 300_000) return [];
  const symbols = [];
  const seen = new Set();

  for (const pattern of SYMBOL_PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match;
    while ((match = regex.exec(content)) && symbols.length < 200) {
      addSymbol(symbols, seen, file, match, pattern);
    }
  }

  const defaultFunction = content.match(/\bexport\s+default\s+function\s+([A-Za-z_$][\w$]*)?\s*\(/);
  if (defaultFunction) {
    const fallbackName = defaultFunction[1] || String(file.path || "default").split("/").pop()?.replace(/\.[^.]+$/, "") || "default";
    addSymbol(symbols, seen, file, { 0: defaultFunction[0], 1: fallbackName, index: defaultFunction.index || 0 }, { type: "function", exported: true });
  }

  return symbols.sort((a, b) => a.line - b.line || a.name.localeCompare(b.name));
}

export function extractSymbolsFromFiles(files = []) {
  return files.flatMap(extractSymbolsFromFile);
}

export function summarizeSymbols(symbols = []) {
  const byType = {};
  const byFile = new Map();
  for (const symbol of symbols) {
    byType[symbol.type] = (byType[symbol.type] || 0) + 1;
    if (!byFile.has(symbol.path)) byFile.set(symbol.path, []);
    byFile.get(symbol.path).push(symbol);
  }
  return {
    total: symbols.length,
    byType,
    filesWithSymbols: byFile.size,
    byFile,
  };
}

export function symbolsForFile(symbols = [], path = "") {
  return symbols.filter((symbol) => symbol.path === path);
}

export function symbolSearchTextForFile(file = {}) {
  return extractSymbolsFromFile(file).map((symbol) => `${symbol.name} ${symbol.type}`).join(" ");
}
