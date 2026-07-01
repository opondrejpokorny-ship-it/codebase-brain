import { estimateTokensFromText } from "@/lib/tokenBudgetUtils";
import { extractSymbolsFromFile } from "@/lib/codeSymbolUtils";

export const CONTEXT_DEPTH_PRESETS = {
  minimal: { maxTokens: 6000, minPositiveFiles: 2, label: "Minimal" },
  balanced: { maxTokens: 12000, minPositiveFiles: 4, label: "Balanced" },
  deep: { maxTokens: 24000, minPositiveFiles: 8, label: "Deep" },
};

export const IMPORTANT_PATH_PATTERNS = [
  /package\.json$/i,
  /src\/api\//i,
  /base44\/functions\//i,
  /server|function|webhook/i,
  /auth|login|session|permission|role|admin/i,
  /payment|checkout|refund|credit|billing|subscription/i,
  /schema|migration|database|db|entity/i,
  /route|router|page/i,
  /config|vite|next|tsconfig|jsconfig/i,
];

export const LOW_VALUE_PATTERNS = [
  /\.lock$/i,
  /package-lock\.json$/i,
  /yarn\.lock$/i,
  /pnpm-lock\.yaml$/i,
  /snapshot/i,
  /dist\//i,
  /build\//i,
  /coverage\//i,
  /README\.md$/i,
];

export function normalizeForScoring(value = "") {
  return String(value || "").toLowerCase();
}

export function queryWords(value = "") {
  return [...new Set(normalizeForScoring(value).match(/[a-z0-9_.$/-]{3,}/g) || [])].slice(0, 40);
}

export function relationReason(relations = [], filePath = "", changedFiles = []) {
  for (const changed of changedFiles) {
    const direct = relations.find((relation) => relation.from_file === filePath && relation.to_file === changed);
    if (direct) return `Selected because it imports changed file ${changed}.`;
    const reverse = relations.find((relation) => relation.from_file === changed && relation.to_file === filePath);
    if (reverse) return `Selected because changed file ${changed} imports it.`;
  }
  return null;
}

function symbolMatchesQuery(symbols = [], questionWords = [], question = "", diffText = "") {
  const haystack = normalizeForScoring(`${question}\n${diffText}`);
  const matches = [];
  for (const symbol of symbols) {
    const name = normalizeForScoring(symbol.name);
    if (!name) continue;
    const direct = haystack.includes(name);
    const wordHit = questionWords.some((word) => name.includes(word) || word.includes(name));
    if (direct || wordHit) matches.push(symbol);
  }
  return matches.slice(0, 4);
}

export function scoreContextFile({ file, questionWords = [], question = "", diffText = "", changedFiles = [], relatedPaths = [], relations = [] }) {
  const path = file.path || "";
  const content = file.content || "";
  const normalizedPath = normalizeForScoring(path);
  const normalizedContent = normalizeForScoring(content.slice(0, 12000));
  const symbols = extractSymbolsFromFile(file);
  const matchingSymbols = symbolMatchesQuery(symbols, questionWords, question, diffText);
  const reasons = [];
  let score = 0;

  if (changedFiles.includes(path)) {
    score += 120;
    reasons.push("Selected because it is directly changed.");
  }

  if (relatedPaths.includes(path)) {
    score += 70;
    reasons.push(relationReason(relations, path, changedFiles) || "Selected because the graph connects it to a changed file.");
  }

  if (normalizeForScoring(question).includes(normalizedPath) || normalizeForScoring(diffText).includes(normalizedPath)) {
    score += 80;
    reasons.push("Selected because the path is mentioned in the question or diff.");
  }

  if (matchingSymbols.length) {
    score += 45 + Math.min(30, matchingSymbols.length * 8);
    reasons.push(`Selected because symbols match the request: ${matchingSymbols.map((symbol) => symbol.name).join(", ")}.`);
  }

  for (const word of questionWords) {
    if (normalizedPath.includes(word)) {
      score += 18;
      reasons.push(`Selected because path matches “${word}”.`);
    } else if (normalizedContent.includes(word)) {
      score += 5;
    }
  }

  if (IMPORTANT_PATH_PATTERNS.some((pattern) => pattern.test(path))) {
    score += 25;
    reasons.push("Selected because it is a high-signal project file or risky domain file.");
  }

  if (LOW_VALUE_PATTERNS.some((pattern) => pattern.test(path))) {
    score -= 40;
    reasons.push("Lower priority because it looks generated, lockfile, snapshot, or low-value documentation.");
  }

  const estimatedTokens = estimateTokensFromText(content);
  if (estimatedTokens > 4000) {
    score -= 20;
    reasons.push("Lower priority because the file is large.");
  }

  return {
    file,
    score,
    reasons: [...new Set(reasons)].slice(0, 4),
    estimatedTokens,
    symbols,
  };
}

export function scoreContextFiles(input = {}) {
  const questionWords = queryWords(`${input.question || ""} ${input.diffText || ""}`);
  return (input.files || [])
    .map((file) => scoreContextFile({ ...input, file, questionWords }))
    .sort((a, b) => b.score - a.score);
}

export function resolveContextDepthPreset(depth = "balanced") {
  return CONTEXT_DEPTH_PRESETS[depth] || CONTEXT_DEPTH_PRESETS.balanced;
}
