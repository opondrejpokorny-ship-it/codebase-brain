import { extractSymbolsFromFile } from "@/lib/codeSymbolUtils";

function normalizePath(path = "") {
  return String(path || "").replace(/^a\//, "").replace(/^b\//, "");
}

function addTouchedLine(map, path, line) {
  if (!path || !Number.isFinite(Number(line))) return;
  const key = normalizePath(path);
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(Number(line));
}

export function parseTouchedLinesByFile(diffText = "") {
  const touched = new Map();
  let currentFile = "";
  let newLine = null;

  for (const rawLine of String(diffText || "").split(/\r?\n/)) {
    const diffMatch = rawLine.match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (diffMatch) {
      currentFile = normalizePath(diffMatch[2]);
      newLine = null;
      continue;
    }

    const plusFile = rawLine.match(/^\+\+\+ b\/(.+)$/);
    if (plusFile) {
      currentFile = normalizePath(plusFile[1]);
      continue;
    }

    const hunk = rawLine.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      newLine = Number(hunk[1]);
      continue;
    }

    if (!currentFile || newLine == null) continue;

    if (rawLine.startsWith("+") && !rawLine.startsWith("+++")) {
      addTouchedLine(touched, currentFile, newLine);
      newLine += 1;
      continue;
    }

    if (rawLine.startsWith("-") && !rawLine.startsWith("---")) {
      continue;
    }

    newLine += 1;
  }

  return touched;
}

function nearestSymbolForLine(symbols = [], line) {
  const before = symbols.filter((symbol) => Number(symbol.line) <= Number(line));
  if (!before.length) return null;
  return before.sort((a, b) => Number(b.line) - Number(a.line))[0];
}

function diffSymbolNames(diffText = "") {
  const names = new Set();
  const text = String(diffText || "");
  const patterns = [
    /\b(?:export\s+default\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g,
    /\b(?:export\s+)?class\s+([A-Za-z_$][\w$]*)\b/g,
    /\b(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text))) {
      if (match[1]) names.add(match[1]);
    }
  }
  return names;
}

function uniqueSymbols(symbols = []) {
  const byKey = new Map();
  for (const symbol of symbols) {
    const key = `${symbol.path}|${symbol.name}|${symbol.type}`;
    const existing = byKey.get(key);
    byKey.set(key, existing ? { ...existing, exported: existing.exported || symbol.exported } : symbol);
  }
  return [...byKey.values()].sort((a, b) => String(a.path).localeCompare(String(b.path)) || Number(a.line) - Number(b.line));
}

export function detectChangedSymbols({ files = [], changedFiles = [], diffText = "" } = {}) {
  const touchedByFile = parseTouchedLinesByFile(diffText);
  const namesFromDiff = diffSymbolNames(diffText);
  const fileByPath = new Map(files.map((file) => [normalizePath(file.path), file]));
  const candidates = [];

  for (const path of changedFiles.map(normalizePath)) {
    const file = fileByPath.get(path);
    if (!file) continue;
    const symbols = extractSymbolsFromFile(file);
    if (!symbols.length) continue;

    const startingCount = candidates.length;
    const touchedLines = [...(touchedByFile.get(path) || [])];
    if (!touchedLines.length) {
      candidates.push(...symbols.map((symbol) => ({ ...symbol, reason: "changed_file" })));
      continue;
    }

    for (const line of touchedLines) {
      const symbol = nearestSymbolForLine(symbols, line);
      if (symbol) candidates.push({ ...symbol, touchedLine: line, reason: "nearest_changed_line" });
    }

    if (candidates.length === startingCount && namesFromDiff.size) {
      candidates.push(...symbols.filter((symbol) => namesFromDiff.has(symbol.name)).map((symbol) => ({ ...symbol, reason: "diff_symbol_name" })));
    }
  }

  return uniqueSymbols(candidates).slice(0, 20);
}

export function formatChangedSymbols(symbols = []) {
  if (!symbols.length) return "None detected";
  return symbols.map((symbol) => `- ${symbol.path}:${symbol.line} ${symbol.exported ? "exported " : ""}${symbol.type} ${symbol.name}`).join("\n");
}
