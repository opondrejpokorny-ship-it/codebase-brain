import { buildCodeRelations, relatedPathsForChangedFiles } from "@/lib/codeGraphUtils";
import { buildContextPack, formatContextPackForPrompt } from "@/lib/contextPackBuilder";

function normalize(value = "") {
  return String(value || "").toLowerCase().replace(/[^a-z0-9_./-]+/g, " ").trim();
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function escapeRegExp(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceMarkdownSection(markdown = "", heading = "", replacement = "") {
  const text = String(markdown || "");
  const pattern = new RegExp(`(^##\\s+${escapeRegExp(heading)}\\s*\\n)([\\s\\S]*?)(?=^##\\s+|$)`, "im");
  if (!pattern.test(text)) return text;
  return text.replace(pattern, `$1${String(replacement || "").trim()}\n\n`);
}

export function extractChangedFiles(changeInput = "") {
  const text = String(changeInput || "");
  const files = [];

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const diffGit = trimmed.match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (diffGit) {
      files.push(diffGit[1], diffGit[2]);
      continue;
    }

    const plusFile = trimmed.match(/^\+\+\+ b\/(.+)$/);
    if (plusFile && plusFile[1] !== "/dev/null") {
      files.push(plusFile[1]);
      continue;
    }

    const minusFile = trimmed.match(/^--- a\/(.+)$/);
    if (minusFile && minusFile[1] !== "/dev/null") {
      files.push(minusFile[1]);
      continue;
    }

    if (/^[\w./@-]+\.(js|jsx|ts|tsx|py|rb|go|rs|java|kt|php|json|md|yml|yaml|sql|prisma|css|scss|html)$/i.test(trimmed)) {
      files.push(trimmed.replace(/^a\//, "").replace(/^b\//, ""));
    }
  }

  return unique(files).slice(0, 80);
}

export function heuristicRiskSignals(changeInput = "", changedFiles = []) {
  const text = normalize(`${changeInput}\n${changedFiles.join("\n")}`);
  const signals = [];

  const checks = [
    { key: "core_context", label: "Core context routing or impact engine", pattern: /contextpack|context pack|context routing|compact context|selected context|impactanalysis|impact analysis|impact engine|codegraph|code graph|tokenbudget|risk level|related files/ },
    { key: "payments", label: "Payment or billing flow", pattern: /payment|billing|checkout|invoice|stripe|comgate|credit|membership|subscription|refund/ },
    { key: "auth", label: "Authentication or authorization", pattern: /auth|login|logout|session|jwt|permission|role|admin|protectedroute/ },
    { key: "database", label: "Database schema or persistence", pattern: /prisma|schema|migration|model|entity|database|db\b|sql|storage/ },
    { key: "api", label: "API or backend function", pattern: /api|route|endpoint|webhook|function|server|backend/ },
    { key: "env", label: "Environment or secrets", pattern: /\.env|secret|api_key|apikey|credential|process\.env|deno\.env/ },
    { key: "routing", label: "Routing or navigation", pattern: /router|route|navigate|redirect|pathname|app\.jsx|layout/ },
    { key: "delete", label: "Deletion or destructive operation", pattern: /delete|remove|destroy|drop|truncate/ },
    { key: "validation", label: "Validation or guard logic changed", pattern: /validate|validation|required|guard|permission|role|if\s*\(|throw new error/ },
    { key: "tests", label: "Tests changed", pattern: /test|spec|__tests__|jest|vitest|playwright|cypress/ },
  ];

  for (const check of checks) {
    if (check.pattern.test(text)) signals.push(check.label);
  }

  return signals;
}

export function initialRiskLevel(changeInput = "", changedFiles = [], relations = []) {
  const signals = heuristicRiskSignals(changeInput, changedFiles);
  const highSignals = signals.filter((signal) => /Payment|Authentication|Database|Environment|Deletion/.test(signal));
  const coreEngineSignal = signals.some((signal) => /Core context routing/.test(signal));
  const changedSet = new Set(changedFiles);
  const graphHits = relations.filter((relation) => changedSet.has(relation.from_file) || changedSet.has(relation.to_file)).length;

  if (highSignals.length >= 2) return "high";
  if (coreEngineSignal || highSignals.length === 1 || signals.length >= 3 || changedFiles.length >= 12 || graphHits >= 3) return "medium";
  return "low";
}

export function selectRelevantFilesForImpact(files = [], changedFiles = [], changeInput = "", limit = 10, relatedPaths = []) {
  const pack = buildContextPack({ files, question: changeInput, changedFiles, diffText: changeInput, maxTokens: 12000 });
  const selected = pack.selectedFiles.length ? pack.selectedFiles : files.slice(0, limit);
  const related = new Set(relatedPaths);
  return selected
    .sort((a, b) => Number(related.has(b.path)) - Number(related.has(a.path)))
    .slice(0, limit);
}

function storedFileCoverage(files = [], changedFiles = []) {
  const stored = new Set(files.map((file) => file.path));
  const present = changedFiles.filter((file) => stored.has(file));
  const missing = changedFiles.filter((file) => !stored.has(file));
  return { present, missing };
}

function selectedFileReasons(contextPack) {
  return contextPack.selectedFiles
    .map((file) => {
      const reasons = contextPack.reasons[file.path] || [];
      return `- ${file.path}: ${reasons.join(" ") || "Selected by compact context pack."}`;
    })
    .join("\n");
}

function isMissingContextRelation(relation) {
  return relation?.relation_type === "alias_unresolved" || relation?.relation_type === "unresolved_relative";
}

function isInternalContextRelation(relation) {
  return relation?.target_kind === "internal_file" || Boolean(relation?.to_file);
}

function isChangedFileRelation(relation, changedSet) {
  if (!relation || changedSet.size === 0) return false;
  return changedSet.has(relation.from_file) || (relation.to_file && changedSet.has(relation.to_file));
}

function suggestedMissingPath(importPath = "") {
  const value = String(importPath || "");
  if (value.startsWith("@/") || value.startsWith("~/")) return `src/${value.slice(2)}`;
  if (value.startsWith("src/")) return value;
  return value;
}

function missingContextLabel(relation) {
  const target = suggestedMissingPath(relation?.import_path || "");
  const suffix = target
    ? `try ${target}.{js,jsx,ts,tsx} or ${target}/index.{js,jsx,ts,tsx}`
    : "target path could not be inferred";
  return `${relation.from_file} imports ${relation.import_path} -> missing from stored context; ${suffix}`;
}

function uniqueRelations(relations = []) {
  const seen = new Set();
  return relations.filter((relation) => {
    const key = `${relation.from_file}|${relation.relation_type}|${relation.import_path}|${relation.to_file || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueMissingTargets(relations = []) {
  return [...new Set(relations.map((relation) => suggestedMissingPath(relation?.import_path || "")).filter(Boolean))];
}

function buildContextCoverageSummary(contextPack, changedFiles = []) {
  const changedSet = new Set(changedFiles);
  const selectedRelations = contextPack?.selectedRelations || [];
  const changedConnectedRelations = selectedRelations.filter((relation) => isChangedFileRelation(relation, changedSet));
  const missingContextRelations = uniqueRelations(changedConnectedRelations.filter(isMissingContextRelation));
  const directChangedRelations = changedConnectedRelations.filter((relation) => !isMissingContextRelation(relation));
  const resolvedInternal = directChangedRelations.filter(isInternalContextRelation).length;
  const missing = missingContextRelations.length;
  const total = resolvedInternal + missing;
  const score = total ? Math.round((resolvedInternal / total) * 100) : 100;

  let status = "complete";
  if (score < 50) status = "low";
  else if (score < 80) status = "partial";
  else if (score < 100) status = "good";

  return {
    status,
    score,
    resolvedInternal,
    missing,
    total,
    missingContextRelations,
    missingTargets: uniqueMissingTargets(missingContextRelations),
  };
}

export function concreteHighRiskTriggers(changeInput = "", signals = []) {
  const text = normalize(changeInput);
  const triggers = [];
  const signalText = signals.join(" ");

  if (/Authentication|authorization|Environment|Payment|Database|Deletion/.test(signalText)) {
    triggers.push("high-risk deterministic signal");
  }
  if (/auth|permission|role|jwt|session|login|logout|admin/.test(text)) triggers.push("auth or permission change");
  if (/payment|billing|refund|checkout|stripe|comgate|invoice|subscription/.test(text)) triggers.push("payment or billing change");
  if (/migration|schema|database|data loss|drop table|truncate|delete all|destructive/.test(text)) triggers.push("database or destructive data change");
  if (/secret|credential|api key|apikey|\.env|process env|deno env/.test(text)) triggers.push("secret or environment change");
  if (/breaking api|public api|contract|backward incompatible|production outage|downtime/.test(text)) triggers.push("breaking API or outage risk");

  return unique(triggers);
}

export function buildImpactAnalysisPrompt({ project, files = [], changeInput = "", relations = null, riskMemoryText = "", projectRulesText = "" }) {
  const changedFiles = extractChangedFiles(changeInput);
  const codeRelations = relations || buildCodeRelations(files);
  const heuristicRisk = initialRiskLevel(changeInput, changedFiles, codeRelations);
  const signals = heuristicRiskSignals(changeInput, changedFiles);
  const relatedPaths = relatedPathsForChangedFiles(codeRelations, changedFiles);
  const coverage = storedFileCoverage(files, changedFiles);
  const contextPack = buildContextPack({
    project,
    files,
    relations: codeRelations,
    question: changeInput,
    changedFiles,
    diffText: changeInput,
    maxTokens: 12000,
  });
  const contextCoverage = buildContextCoverageSummary(contextPack, changedFiles);

  const confirmedRelatedInstruction = relatedPaths.length
    ? `Only these graph-confirmed related files may be listed as related files: ${relatedPaths.join(", ")}.`
    : "No graph-confirmed related files were found. In the Related files section, say 'None confirmed by the current graph/context sample' and then optionally list selected context files separately as 'Context files reviewed'. Do not invent related files.";

  const missingContextLines = contextCoverage.missingContextRelations.length
    ? contextCoverage.missingContextRelations.map((relation) => `- ${missingContextLabel(relation)}`).join("\n")
    : "None";
  const missingTargetsLines = contextCoverage.missingTargets.length
    ? contextCoverage.missingTargets.map((target) => `- ${target}`).join("\n")
    : "None";

  return {
    changedFiles,
    heuristicRisk,
    signals,
    relatedPaths,
    relevantRelations: contextPack.selectedRelations,
    relevantFiles: contextPack.selectedFiles,
    contextPack,
    contextCoverage,
    prompt: `You are Codebase Brain, a careful senior engineer reviewing a PR/diff before merge.

Rules:
- Write the entire report in English only. Do not use Czech, Chinese, or any other language.
- If the input or context contains non-English text, translate the meaning into English before writing the report.
- Answer only from the provided project context, selected files, submitted diff/change list, graph relationships, risk memory, and project rules.
- Treat project rules and ADRs as durable project constraints.
- Do not claim you ran tests.
- Always mention missing context.
- Use concrete file paths.
- Be practical and concise.
- Do not invent direct dependencies or related files. ${confirmedRelatedInstruction}
- If a changed file is not present in the stored project sample, say so clearly in Missing context.
- If Context coverage below is not complete, the Missing context section must mention the coverage status, missing direct import targets, and suggested missing import targets. Do not say that no context is missing when Missing direct import targets is greater than 0.

Risk calibration:
- Treat the deterministic pre-scan risk as the baseline. Raise or lower it only when the selected context gives concrete evidence.
- Risk memory is advisory only. It can justify extra attention, but it must not be the primary reason for High risk.
- Older Risk Memory entries may come from earlier, less-calibrated analysis versions. Do not repeat historical High risk labels unless the current submitted change contains a concrete high-risk trigger.
- Do not mark High risk only because a file is important, core, user-facing, connected to an external integration, or repeatedly seen in Risk Memory. Those are usually Medium unless there is a concrete high-risk trigger.
- High risk requires specific evidence of at least one of these in the current submitted change: security/auth/permission breakage, payment/billing/refund impact, database migration or data loss, secrets/env leakage, destructive operations, production outage risk, breaking public API/contract changes, or broad changes across many unrelated areas.
- Mentioning GitHub, Base44, API, context routing, or impact analysis is not enough for High risk by itself. Prefer Medium for core engine changes without a specific high-risk trigger.
- If choosing High, the Why this risk level section must name the concrete high-risk trigger from the current submitted change.
- If details are unknown, describe them in Missing context; do not inflate to High solely because context is missing or because past reports were High.

Return structured Markdown with exactly these sections:

## Summary
Short explanation of the change.

## Risk level
Low / Medium / High

## Why this risk level
Bullet points.

## Changed files
List changed files. Mark files missing from stored context when applicable.

## Related files
Only graph-confirmed related files. If none are confirmed, say none confirmed.

## Context files reviewed
List selected context files and why they were selected.

## Risk memory influence
Explain whether previous analyses mention the same changed files, related files, risk signals, or recommended tests. If there is no history, say no previous analysis history is available. Do not overstate this section.

## Project rules check
Check the submitted change against active project rules and ADRs. Say whether each relevant rule appears satisfied, potentially violated, or cannot be evaluated from the available context.

## Affected flows
User-facing or backend flows that may be affected.

## Main risks
Concrete risks.

## Recommended tests
Manual and automated tests to run. Prefer tests that match repeated Risk Memory patterns when relevant and project rules when relevant.

## Regression checklist
Step-by-step checklist before merge.

## Missing context
What the system could not know from imported files. Include Context coverage and Missing direct import targets when provided.

## Safe to merge?
One of:
- Looks safe after listed checks
- Needs review
- High risk, do not merge without deeper review

PROJECT:
Name: ${project?.name || "Unknown"}
Repository URL: ${project?.repository_url || "Not provided"}
Detected stack: ${(project?.detected_stack || []).join(", ") || "Unknown"}

DETERMINISTIC PRE-SCAN:
Changed files detected: ${changedFiles.length ? changedFiles.join(", ") : "None detected from input"}
Changed files present in stored sample: ${coverage.present.length ? coverage.present.join(", ") : "None"}
Changed files missing from stored sample: ${coverage.missing.length ? coverage.missing.join(", ") : "None"}
Initial heuristic risk: ${heuristicRisk}
Risk signals: ${signals.length ? signals.join(", ") : "None"}
Graph-confirmed related files: ${relatedPaths.length ? relatedPaths.join(", ") : "None"}
Selected context files reviewed:
${selectedFileReasons(contextPack) || "None"}
Context token estimate: selected ${contextPack.efficiency.selectedTokens}, full repo estimate ${contextPack.efficiency.fullRepoTokens}, estimated savings ${contextPack.efficiency.savingsPercent}%
Context coverage: ${contextCoverage.status} · ${contextCoverage.score}%
Resolved internal imports from changed files: ${contextCoverage.resolvedInternal}/${contextCoverage.total}
Missing direct import targets: ${contextCoverage.missing}
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

export function extractRiskLevelFromAnalysis(text = "", fallback = "medium") {
  const normalized = normalize(text);
  const explicit = normalized.match(/risk level\s*[:\-]?\s*(low|medium|high)/i);
  if (explicit) return explicit[1].toLowerCase();
  if (/\bhigh\b/.test(normalized)) return "high";
  if (/\bmedium\b/.test(normalized)) return "medium";
  if (/\blow\b/.test(normalized)) return "low";
  return fallback;
}

export function calibrateImpactAnalysisOutput({ text = "", heuristicRisk = "medium", signals = [], changeInput = "" } = {}) {
  const originalText = String(text || "");
  const parsedRisk = extractRiskLevelFromAnalysis(originalText, heuristicRisk);
  const triggers = concreteHighRiskTriggers(changeInput, signals);
  const shouldDowngradeHigh = parsedRisk === "high" && heuristicRisk !== "high" && triggers.length === 0;

  if (!shouldDowngradeHigh) {
    return { text: originalText, riskLevel: parsedRisk, adjusted: false, triggers };
  }

  const existingWhy = originalText.match(/(^##\s+Why this risk level\s*\n)([\s\S]*?)(?=^##\s+|$)/im)?.[2]?.trim() || "";
  const adjustedWhy = `${existingWhy}\n- Risk calibration guard: adjusted the final risk to Medium because the deterministic pre-scan was ${heuristicRisk} and the submitted change did not contain a concrete High-risk trigger such as security/auth, payment, data loss, secrets, destructive operations, production outage, or breaking public API changes.`.trim();

  let calibrated = replaceMarkdownSection(originalText, "Risk level", "Medium");
  calibrated = replaceMarkdownSection(calibrated, "Why this risk level", adjustedWhy);
  calibrated = replaceMarkdownSection(calibrated, "Safe to merge?", "Needs review");

  return { text: calibrated, riskLevel: "medium", adjusted: true, triggers };
}
