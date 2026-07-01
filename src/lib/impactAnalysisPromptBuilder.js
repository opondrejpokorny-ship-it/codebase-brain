import { buildCodeRelations, relatedPathsForChangedFiles } from "@/lib/codeGraphUtils";
import { buildContextPack, formatContextPackForPrompt } from "@/lib/contextPackBuilder";
import { detectChangedSymbols, formatChangedSymbols } from "@/lib/changedSymbolUtils";
import { extractChangedFiles, heuristicRiskSignals, initialRiskLevel } from "@/lib/impactAnalysisUtils";
import { resolveContextDepthPreset } from "@/lib/contextRelevanceScoring";

function storedFileCoverage(files = [], changedFiles = []) {
  const stored = new Set(files.map((file) => file.path));
  return {
    present: changedFiles.filter((file) => stored.has(file)),
    missing: changedFiles.filter((file) => !stored.has(file)),
  };
}

function selectedFileReasons(contextPack) {
  return contextPack.selectedFiles
    .map((file) => `- ${file.path}: ${(contextPack.reasons[file.path] || []).join(" ") || "Selected by compact context pack."}`)
    .join("\n");
}

function relationMissingPath(importPath = "") {
  const value = String(importPath || "");
  if (value.startsWith("@/") || value.startsWith("~/")) return `src/${value.slice(2)}`;
  if (value.startsWith("src/")) return value;
  return value;
}

function missingContextRelationsForChangedFiles(contextPack, changedFiles = []) {
  const changedSet = new Set(changedFiles);
  return (contextPack.selectedRelations || []).filter((relation) => {
    const connected = changedSet.has(relation.from_file) || (relation.to_file && changedSet.has(relation.to_file));
    const missing = relation.relation_type === "alias_unresolved" || relation.relation_type === "unresolved_relative";
    return connected && missing;
  });
}

function contextCoverageSummary(contextPack, changedFiles = []) {
  const changedSet = new Set(changedFiles);
  const changedConnected = (contextPack.selectedRelations || []).filter((relation) => changedSet.has(relation.from_file) || (relation.to_file && changedSet.has(relation.to_file)));
  const missingContextRelations = missingContextRelationsForChangedFiles(contextPack, changedFiles);
  const resolvedInternal = changedConnected.filter((relation) => !missingContextRelations.includes(relation) && (relation.target_kind === "internal_file" || relation.to_file)).length;
  const total = resolvedInternal + missingContextRelations.length;
  const score = total ? Math.round((resolvedInternal / total) * 100) : 100;
  const status = score < 50 ? "low" : score < 80 ? "partial" : score < 100 ? "good" : "complete";
  const missingTargets = [...new Set(missingContextRelations.map((relation) => relationMissingPath(relation.import_path)).filter(Boolean))];
  return { status, score, resolvedInternal, total, missingContextRelations, missingTargets };
}

function missingContextLine(relation) {
  const target = relationMissingPath(relation.import_path);
  return `- ${relation.from_file} imports ${relation.import_path} -> missing from stored context; try ${target}.{js,jsx,ts,tsx} or ${target}/index.{js,jsx,ts,tsx}`;
}

export function buildImpactAnalysisPromptWithDepth({ project, files = [], changeInput = "", relations = null, riskMemoryText = "", projectRulesText = "", contextDepth = "balanced" }) {
  const changedFiles = extractChangedFiles(changeInput);
  const changedSymbols = detectChangedSymbols({ files, changedFiles, diffText: changeInput });
  const codeRelations = relations || buildCodeRelations(files);
  const heuristicRisk = initialRiskLevel(changeInput, changedFiles, codeRelations);
  const signals = heuristicRiskSignals(changeInput, changedFiles);
  const relatedPaths = relatedPathsForChangedFiles(codeRelations, changedFiles);
  const coverage = storedFileCoverage(files, changedFiles);
  const preset = resolveContextDepthPreset(contextDepth);
  const contextPack = buildContextPack({ project, files, relations: codeRelations, question: changeInput, changedFiles, diffText: changeInput, maxTokens: preset.maxTokens, depth: contextDepth });
  const contextCoverage = contextCoverageSummary(contextPack, changedFiles);
  const missingContextLines = contextCoverage.missingContextRelations.length ? contextCoverage.missingContextRelations.map(missingContextLine).join("\n") : "None";
  const missingTargetsLines = contextCoverage.missingTargets.length ? contextCoverage.missingTargets.map((target) => `- ${target}`).join("\n") : "None";
  const confirmedRelatedInstruction = relatedPaths.length
    ? `Only these graph-confirmed related files may be listed as related files: ${relatedPaths.join(", ")}.`
    : "No graph-confirmed related files were found. In the Related files section, say 'None confirmed by the current graph/context sample'. Do not invent related files.";

  return {
    changedFiles,
    changedSymbols,
    heuristicRisk,
    signals,
    relatedPaths,
    relevantRelations: contextPack.selectedRelations,
    relevantFiles: contextPack.selectedFiles,
    contextPack,
    contextCoverage,
    prompt: `You are Codebase Brain, a careful senior engineer reviewing a submitted diff before merge.

Rules:
- Write the report in English only.
- Use only the provided project context, selected files, submitted diff, graph relationships, risk memory, project rules, and changed symbols.
- Do not claim tests were run.
- Mention missing context.
- Use concrete file paths.
- When changed symbols are available, describe the likely impact at symbol level.
- In the "Risk memory influence" section, explicitly mention any relevant frequently changed symbols from Risk Memory by name and count. If none are relevant, say that no relevant symbol-level history was found.
- ${confirmedRelatedInstruction}

Return structured Markdown with exactly these sections:

## Summary
## Risk level
## Why this risk level
## Changed files
## Related files
## Context files reviewed
## Risk memory influence
## Project rules check
## Affected flows
## Main risks
## Recommended tests
## Regression checklist
## Missing context
## Safe to merge?

PROJECT:
Name: ${project?.name || "Unknown"}
Repository URL: ${project?.repository_url || "Not provided"}
Detected stack: ${(project?.detected_stack || []).join(", ") || "Unknown"}

DETERMINISTIC PRE-SCAN:
Changed files detected: ${changedFiles.length ? changedFiles.join(", ") : "None detected from input"}
Changed symbols detected:
${formatChangedSymbols(changedSymbols)}
Changed files present in stored sample: ${coverage.present.length ? coverage.present.join(", ") : "None"}
Changed files missing from stored sample: ${coverage.missing.length ? coverage.missing.join(", ") : "None"}
Initial heuristic risk: ${heuristicRisk}
Risk signals: ${signals.length ? signals.join(", ") : "None"}
Graph-confirmed related files: ${relatedPaths.length ? relatedPaths.join(", ") : "None"}
Context depth: ${contextPack.depthPreset || preset.label}
Selected context files reviewed:
${selectedFileReasons(contextPack) || "None"}
Context token estimate: selected ${contextPack.efficiency.selectedTokens}, full repo estimate ${contextPack.efficiency.fullRepoTokens}, estimated savings ${contextPack.efficiency.savingsPercent}%
Context coverage: ${contextCoverage.status} · ${contextCoverage.score}%
Resolved internal imports from changed files: ${contextCoverage.resolvedInternal}/${contextCoverage.total}
Missing direct import targets: ${contextCoverage.missingContextRelations.length}
Missing context candidates:
${missingContextLines}
Suggested missing import targets:
${missingTargetsLines}

RISK MEMORY:
${riskMemoryText || "No previous impact analyses are available for this project."}

PROJECT RULES / ADR MEMORY:
${projectRulesText || "No project rules or ADRs are available for this project."}

COMPACT CONTEXT PACK:
${formatContextPackForPrompt(contextPack)}

SUBMITTED DIFF OR CHANGE LIST:
${String(changeInput || "").slice(0, 15000)}`,
  };
}
