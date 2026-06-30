import { buildCodeRelations, relatedPathsForChangedFiles, summarizeCodeGraph } from "@/lib/codeGraphUtils";
import { buildContextEfficiencyReport, estimateFilesTokens, estimateTokensFromText } from "@/lib/tokenBudgetUtils";

const IMPORTANT_PATH_PATTERNS = [
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

const LOW_VALUE_PATTERNS = [
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

function normalize(value = "") {
  return String(value || "").toLowerCase();
}

function words(value = "") {
  return [...new Set(normalize(value).match(/[a-z0-9_.$/-]{3,}/g) || [])].slice(0, 40);
}

function includesPath(haystack = "", path = "") {
  return normalize(haystack).includes(normalize(path));
}

function relationReason(relations = [], filePath = "", changedFiles = []) {
  for (const changed of changedFiles) {
    const direct = relations.find((relation) => relation.from_file === filePath && relation.to_file === changed);
    if (direct) return `Selected because it imports changed file ${changed}.`;
    const reverse = relations.find((relation) => relation.from_file === changed && relation.to_file === filePath);
    if (reverse) return `Selected because changed file ${changed} imports it.`;
  }
  return null;
}

function scoreFile({ file, questionWords, question, diffText, changedFiles, relatedPaths, relations }) {
  const path = file.path || "";
  const content = file.content || "";
  const normalizedPath = normalize(path);
  const normalizedContent = normalize(content.slice(0, 12000));
  const reasons = [];
  let score = 0;

  if (changedFiles.includes(path)) {
    score += 120;
    reasons.push("Selected because it is directly changed.");
  }

  if (relatedPaths.includes(path)) {
    score += 70;
    const reason = relationReason(relations, path, changedFiles);
    reasons.push(reason || "Selected because the graph connects it to a changed file.");
  }

  if (includesPath(question, path) || includesPath(diffText, path)) {
    score += 80;
    reasons.push("Selected because the path is mentioned in the question or diff.");
  }

  for (const word of questionWords) {
    if (normalizedPath.includes(word)) {
      score += 18;
      reasons.push(`Selected because path matches “${word}”.`);
    } else if (normalizedContent.includes(word)) {
      score += 5;
    }
  }

  for (const pattern of IMPORTANT_PATH_PATTERNS) {
    if (pattern.test(path)) {
      score += 25;
      reasons.push("Selected because it is a high-signal project file or risky domain file.");
      break;
    }
  }

  for (const pattern of LOW_VALUE_PATTERNS) {
    if (pattern.test(path)) {
      score -= 40;
      reasons.push("Lower priority because it looks generated, lockfile, snapshot, or low-value documentation.");
      break;
    }
  }

  const sizeTokens = estimateTokensFromText(content);
  if (sizeTokens > 4000) {
    score -= 20;
    reasons.push("Lower priority because the file is large.");
  }

  return {
    file,
    score,
    reasons: [...new Set(reasons)].slice(0, 4),
    estimatedTokens: sizeTokens,
  };
}

export function buildContextPack({
  project,
  files = [],
  relations = null,
  question = "",
  changedFiles = [],
  diffText = "",
  maxTokens = 12000,
} = {}) {
  const graphRelations = relations || buildCodeRelations(files);
  const graphSummary = summarizeCodeGraph(graphRelations);
  const relatedPaths = relatedPathsForChangedFiles(graphRelations, changedFiles);
  const questionWords = words(`${question} ${diffText}`);

  const scored = files
    .map((file) => scoreFile({ file, questionWords, question, diffText, changedFiles, relatedPaths, relations: graphRelations }))
    .sort((a, b) => b.score - a.score);

  const selectedFiles = [];
  const reasons = {};
  let tokens = estimateTokensFromText(project?.summary || "") + estimateTokensFromText(diffText.slice(0, 4000));

  for (const item of scored) {
    if (item.score <= 0 && selectedFiles.length >= 4) continue;
    const nextTokens = tokens + item.estimatedTokens;
    if (selectedFiles.length > 0 && nextTokens > maxTokens) continue;
    selectedFiles.push(item.file);
    reasons[item.file.path] = item.reasons.length ? item.reasons : ["Selected as part of the compact context pack."];
    tokens = nextTokens;
    if (tokens >= maxTokens) break;
  }

  if (selectedFiles.length === 0 && files.length > 0) {
    selectedFiles.push(files[0]);
    reasons[files[0].path] = ["Selected as fallback because no stronger relevance signal was detected."];
  }

  const selectedPaths = new Set(selectedFiles.map((file) => file.path));
  const selectedRelations = graphRelations.filter((relation) => selectedPaths.has(relation.from_file) || (relation.to_file && selectedPaths.has(relation.to_file)));
  const warnings = [];

  if (files.length === 0) warnings.push("No stored files are available for this project.");
  if (graphSummary.unresolvedRelativeImports > 0 || graphSummary.aliasUnresolvedImports > 0) warnings.push("Some imports are unresolved; the imported sample may be incomplete or aliases may need deeper config support.");
  if (selectedFiles.length < files.length) warnings.push("Context was intentionally reduced. The full repository was not sent to AI.");
  if (tokens > maxTokens) warnings.push("Selected context may exceed the target token budget.");

  const efficiency = buildContextEfficiencyReport({
    allFiles: files,
    selectedFiles,
    extraContextText: `${project?.summary || ""}\n${diffText || ""}`,
  });

  return {
    selectedFiles,
    selectedRelations,
    projectSummary: project?.summary || "No project summary available.",
    graphSummary,
    reasons,
    estimatedTokens: estimateFilesTokens(selectedFiles),
    efficiency,
    warnings,
    maxTokens,
  };
}

export function formatContextPackForPrompt(contextPack) {
  const relationLines = contextPack.selectedRelations
    .slice(0, 80)
    .map((relation) => `- ${relation.from_file} ${relation.relation_type} ${relation.import_path}${relation.to_file ? ` -> ${relation.to_file}` : ""}`)
    .join("\n");

  const fileBlocks = contextPack.selectedFiles
    .map((file) => {
      const reasonText = (contextPack.reasons[file.path] || []).map((reason) => `// ${reason}`).join("\n");
      return `--- ${file.path} ---\n${reasonText}\n${String(file.content || "").slice(0, 8000)}`;
    })
    .join("\n\n");

  return `Project summary:\n${contextPack.projectSummary}\n\nSelected relations:\n${relationLines || "No selected relations."}\n\nWarnings:\n${contextPack.warnings.map((warning) => `- ${warning}`).join("\n") || "- None"}\n\nSelected files:\n${fileBlocks || "No files selected."}`;
}
