import { buildCodeRelations, relatedPathsForChangedFiles, summarizeCodeGraph } from "@/lib/codeGraphUtils";
import { scoreContextFiles, resolveContextDepthPreset } from "@/lib/contextRelevanceScoring";
import { buildContextEfficiencyReport, estimateFilesTokens, estimateTokensFromText } from "@/lib/tokenBudgetUtils";

export function buildContextPack(input = {}) {
  const {
    project,
    files = [],
    relations = null,
    question = "",
    changedFiles = [],
    diffText = "",
    maxTokens = 12000,
    depth = "balanced",
  } = /** @type {any} */ (input);
  const preset = resolveContextDepthPreset(depth);
  const tokenBudget = Number(maxTokens || preset.maxTokens || 12000);
  const minPositiveFiles = Number(preset.minPositiveFiles || 4);
  const graphRelations = relations || buildCodeRelations(files);
  const graphSummary = summarizeCodeGraph(graphRelations);
  const relatedPaths = relatedPathsForChangedFiles(graphRelations, changedFiles);

  const scored = scoreContextFiles({
    files,
    question,
    diffText,
    changedFiles,
    relatedPaths,
    relations: graphRelations,
  });

  const selectedFiles = [];
  const reasons = {};
  const relevanceScores = {};
  let tokens = estimateTokensFromText(project?.summary || "") + estimateTokensFromText(diffText.slice(0, 4000));

  for (const item of scored) {
    if (item.score <= 0 && selectedFiles.length >= minPositiveFiles) continue;
    const nextTokens = tokens + item.estimatedTokens;
    if (selectedFiles.length > 0 && nextTokens > tokenBudget) continue;
    selectedFiles.push(item.file);
    reasons[item.file.path] = item.reasons.length ? item.reasons : ["Selected as part of the compact context pack."];
    relevanceScores[item.file.path] = item.score;
    tokens = nextTokens;
    if (tokens >= tokenBudget) break;
  }

  if (selectedFiles.length === 0 && files.length > 0) {
    selectedFiles.push(files[0]);
    reasons[files[0].path] = ["Selected as fallback because no stronger relevance signal was detected."];
    relevanceScores[files[0].path] = 0;
  }

  const selectedPaths = new Set(selectedFiles.map((file) => file.path));
  const selectedRelations = graphRelations.filter((relation) => selectedPaths.has(relation.from_file) || (relation.to_file && selectedPaths.has(relation.to_file)));
  const warnings = [];

  if (files.length === 0) warnings.push("No stored files are available for this project.");
  if (graphSummary.unresolvedRelativeImports > 0 || graphSummary.aliasUnresolvedImports > 0) warnings.push("Some imports are unresolved; the imported sample may be incomplete or aliases may need deeper config support.");
  if (selectedFiles.length < files.length) warnings.push("Context was intentionally reduced. The full repository was not sent to AI.");
  if (tokens > tokenBudget) warnings.push("Selected context may exceed the target token budget.");

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
    relevanceScores,
    depth,
    depthPreset: preset.label,
    estimatedTokens: estimateFilesTokens(selectedFiles),
    efficiency,
    warnings,
    maxTokens: tokenBudget,
  };
}

export function formatContextPackForPrompt(contextPack) {
  const relationLines = contextPack.selectedRelations
    .slice(0, 80)
    .map((relation) => `- ${relation.from_file} ${relation.relation_type} ${relation.import_path}${relation.to_file ? ` -> ${relation.to_file}` : ""}`)
    .join("\n");

  const fileBlocks = contextPack.selectedFiles
    .map((file) => {
      const score = contextPack.relevanceScores?.[file.path];
      const reasonText = (contextPack.reasons[file.path] || []).map((reason) => `// ${reason}`).join("\n");
      const scoreText = Number.isFinite(score) ? `// Relevance score: ${score}\n` : "";
      return `--- ${file.path} ---\n${scoreText}${reasonText}\n${String(file.content || "").slice(0, 8000)}`;
    })
    .join("\n\n");

  return `Project summary:\n${contextPack.projectSummary}\n\nContext depth: ${contextPack.depthPreset || contextPack.depth || "Balanced"}\n\nSelected relations:\n${relationLines || "No selected relations."}\n\nWarnings:\n${contextPack.warnings.map((warning) => `- ${warning}`).join("\n") || "- None"}\n\nSelected files:\n${fileBlocks || "No files selected."}`;
}
