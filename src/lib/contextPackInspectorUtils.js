import { missingContextQueueItem } from "@/lib/missingContextQueueUtils";
import { formatEstimatedTokens } from "@/lib/tokenBudgetUtils";

export function relationLabel(relation) {
  if (!relation) return "";
  return `${relation.from_file} ${relation.relation_type} ${relation.import_path}${relation.to_file ? ` → ${relation.to_file}` : ""}`;
}

export function isChangedFileRelation(relation, changedSet) {
  if (!relation || changedSet.size === 0) return false;
  return changedSet.has(relation.from_file) || (relation.to_file && changedSet.has(relation.to_file));
}

export function isMissingContextRelation(relation) {
  return relation?.relation_type === "alias_unresolved" || relation?.relation_type === "unresolved_relative";
}

export function isInternalContextRelation(relation) {
  return relation?.target_kind === "internal_file" || Boolean(relation?.to_file);
}

export function isSelectedFileRelation(relation, selectedPathSet) {
  if (!relation || !selectedPathSet?.size) return false;
  return selectedPathSet.has(relation.from_file) && Boolean(relation.to_file) && selectedPathSet.has(relation.to_file);
}

export function suggestedMissingPath(importPath = "") {
  const value = String(importPath || "");
  if (value.startsWith("@/") || value.startsWith("~/")) return `src/${value.slice(2)}`;
  if (value.startsWith("src/")) return value;
  return value;
}

export function bestMissingPathGuess(relation) {
  return suggestedMissingPath(relation?.import_path || "");
}

export function missingContextLabel(relation) {
  const target = suggestedMissingPath(relation?.import_path || "");
  const suffix = target ? `try ${target}.{js,jsx,ts,tsx} or ${target}/index.{js,jsx,ts,tsx}` : "target path could not be inferred";
  return `${relation.from_file} imports ${relation.import_path} → missing from stored context; ${suffix}`;
}

export function queueItemFromRelation(relation) {
  return missingContextQueueItem({
    target: bestMissingPathGuess(relation),
    sourceFile: relation?.from_file || "",
    importPath: relation?.import_path || "",
    relationType: relation?.relation_type || "missing_context",
  });
}

export function uniqueRelations(relations = []) {
  const seen = new Set();
  return relations.filter((relation) => {
    const key = `${relation.from_file}|${relation.relation_type}|${relation.import_path}|${relation.to_file || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function uniqueMissingPathGuesses(relations = []) {
  return [...new Set(relations.map(bestMissingPathGuess).filter(Boolean))];
}

export function buildCoverageSummary(directChangedRelations = [], missingContextRelations = []) {
  const resolvedInternal = directChangedRelations.filter(isInternalContextRelation).length;
  const missing = missingContextRelations.length;
  const total = resolvedInternal + missing;
  const score = total ? Math.round((resolvedInternal / total) * 100) : 100;
  let status = "complete";
  if (score < 50) status = "low";
  else if (score < 80) status = "partial";
  else if (score < 100) status = "good";
  return { status, score, resolvedInternal, missing, total };
}

function formatReasons(reasons = []) {
  if (!reasons.length) return "  - No explicit selection reason captured.";
  return reasons.map((reason) => `  - ${reason}`).join("\n");
}

export function buildContextPackCopyText({ contextPack, selectedFiles, directChangedRelations, selectedContextRelations, missingContextRelations, coverage, efficiency }) {
  return `# Codebase Brain Context Pack Summary

Selected files: ${selectedFiles.length}
Selected tokens: ${formatEstimatedTokens(efficiency.selectedTokens || contextPack.estimatedTokens || 0)}
Full repo estimate: ${formatEstimatedTokens(efficiency.fullRepoTokens || 0)}
Estimated savings: ${efficiency.savingsPercent || 0}%
Context coverage: ${coverage.status} · ${coverage.score}%
Resolved internal imports: ${coverage.resolvedInternal}/${coverage.total}
Missing context candidates: ${missingContextRelations.length}

## Context warnings
${(contextPack.warnings || []).length ? (contextPack.warnings || []).map((warning) => `- ${warning}`).join("\n") : "- None"}

## Selected files and reasons
${selectedFiles.map((file) => `### ${file.path}\n${formatReasons(contextPack.reasons?.[file.path] || [])}`).join("\n\n")}

## Missing context candidates
${missingContextRelations.length ? missingContextRelations.map((relation) => `- ${missingContextLabel(relation)}`).join("\n") : "- None"}

## Suggested missing import targets
${uniqueMissingPathGuesses(missingContextRelations).length ? uniqueMissingPathGuesses(missingContextRelations).map((path) => `- ${path}`).join("\n") : "- None"}

## Graph relations connected to changed files
${directChangedRelations.length ? directChangedRelations.map((relation) => `- ${relationLabel(relation)}`).join("\n") : "- None"}

## Relations among selected context files
${selectedContextRelations.length ? selectedContextRelations.slice(0, 20).map((relation) => `- ${relationLabel(relation)}`).join("\n") : "- None"}`;
}
