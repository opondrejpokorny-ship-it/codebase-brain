import { relatedPathsForChangedFiles } from "@/lib/codeGraphUtils";

const IMPORTANT_PATTERNS = [
  /package\.json$/i,
  /src\/api\//i,
  /base44\/functions\//i,
  /auth|login|session|permission|role|admin/i,
  /payment|checkout|refund|credit|billing|subscription/i,
  /webhook|server|function|route/i,
  /schema|migration|database|entity/i,
];

function normalize(value = "") {
  return String(value || "").toLowerCase();
}

function words(value = "") {
  return [...new Set(normalize(value).match(/[a-z0-9_.$/-]{2,}/g) || [])].slice(0, 30);
}

function extractSymbols(content = "") {
  const matches = [];
  const patterns = [
    /function\s+([A-Za-z0-9_$]+)/g,
    /class\s+([A-Za-z0-9_$]+)/g,
    /const\s+([A-Z][A-Za-z0-9_$]+)\s*=\s*\(/g,
    /export\s+(?:default\s+)?function\s+([A-Za-z0-9_$]+)/g,
    /export\s+const\s+([A-Za-z0-9_$]+)/g,
    /def\s+([A-Za-z0-9_]+)\s*\(/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content))) matches.push(match[1]);
  }
  return [...new Set(matches)].slice(0, 40);
}

function matchedSnippets(content = "", queryWords = []) {
  const lines = String(content || "").split("\n");
  const snippets = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const normalized = normalize(line);
    if (queryWords.some((word) => normalized.includes(word))) {
      snippets.push({
        line: i + 1,
        text: lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 2)).join("\n").slice(0, 600),
      });
    }
    if (snippets.length >= 3) break;
  }

  return snippets;
}

export function searchCodebase({ query = "", files = [], relations = [], limit = 10 } = {}) {
  const queryWords = words(query);
  if (!queryWords.length) return [];

  const directMatches = new Set();
  const results = files.map((file) => {
    const path = file.path || "";
    const content = file.content || "";
    const normalizedPath = normalize(path);
    const normalizedContent = normalize(content.slice(0, 20000));
    const symbols = extractSymbols(content);
    const normalizedSymbols = symbols.map(normalize);
    const reasons = [];
    let score = 0;

    for (const word of queryWords) {
      if (normalizedPath.includes(word)) {
        score += 40;
        reasons.push(`Path matches “${word}”.`);
      }
      if (normalizedContent.includes(word)) {
        score += 12;
        reasons.push(`Content contains “${word}”.`);
      }
      if (normalizedSymbols.some((symbol) => symbol.includes(word))) {
        score += 30;
        reasons.push(`Symbol name matches “${word}”.`);
      }
    }

    const imports = relations.filter((relation) => relation.from_file === path).map((relation) => relation.import_path || relation.to_file || "");
    for (const word of queryWords) {
      if (imports.some((item) => normalize(item).includes(word))) {
        score += 18;
        reasons.push(`Import path matches “${word}”.`);
      }
    }

    for (const pattern of IMPORTANT_PATTERNS) {
      if (pattern.test(path)) {
        score += 8;
        reasons.push("Important project/risk-domain file.");
        break;
      }
    }

    if (score > 0) directMatches.add(path);

    return {
      path,
      language: file.language || "unknown",
      score,
      reasons: [...new Set(reasons)].slice(0, 5),
      matchedSnippets: matchedSnippets(content, queryWords),
      symbols: symbols.slice(0, 8),
    };
  });

  const graphRelated = relatedPathsForChangedFiles(relations, [...directMatches]);
  for (const result of results) {
    if (graphRelated.includes(result.path)) {
      result.score += 16;
      result.reasons.push("Related through Code Graph Lite to a direct match.");
    }
  }

  return results
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
