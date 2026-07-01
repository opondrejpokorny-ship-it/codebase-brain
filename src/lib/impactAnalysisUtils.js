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
  const fileText = normalize(changedFiles.join("\n"));
  const signals = [];

  const checks = [
    { label: "Core context routing or impact engine", pattern: /contextpack|context pack|context routing|compact context|selected context|impactanalysis|impact analysis|impact engine|codegraph|code graph|tokenbudget|risk level|related files/ },
    { label: "Payment or billing flow", pattern: /payment|billing|checkout|invoice|stripe|comgate|credit|membership|subscription|refund/ },
    { label: "Authentication or authorization", pattern: /auth|login|logout|session|jwt|permission|role|admin|protectedroute/ },
    { label: "Database schema or persistence", pattern: /prisma|schema|migration|model|entity|database|db\b|sql|storage/ },
    { label: "Environment or secrets", pattern: /\.env|secret|api_key|apikey|credential|process\.env|deno\.env/ },
    { label: "Deletion or destructive operation", pattern: /delete|remove|destroy|drop|truncate/ },
    { label: "Validation or guard logic changed", pattern: /validate|validation|required|guard|permission|role|throw new error/ },
    { label: "Tests changed", pattern: /test|spec|__tests__|jest|vitest|playwright|cypress/ },
  ];

  for (const check of checks) {
    if (check.pattern.test(text)) signals.push(check.label);
  }

  if (/\b(api|endpoint|webhook|server|backend|base44\/functions|functions\/|src\/api)\b/.test(text)) {
    signals.push("API or backend function");
  }

  if (/\b(router|route|routes|navigate|redirect|pathname|layout|react-router|src\/routes)\b/.test(text) || /src\/pages\//.test(fileText)) {
    signals.push("Routing or navigation");
  }

  return unique(signals);
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

Project:
${project?.name || "Unknown project"}

Project summary:
${project?.summary || "No project summary available."}

Detected stack:
${(project?.detected_stack || []).join(", ") || "unknown"}

Submitted change:
${String(changeInput || "").slice(0, 12000)}

Changed files detected:
${changedFiles.length ? changedFiles.map((file) => `- ${file}`).join("\n") : "None detected"}

Deterministic pre-scan risk:
${heuristicRisk}

Risk signals:
${signals.length ? signals.map((signal) => `- ${signal}`).join("\n") : "None"}

Graph-confirmed related files:
${relatedPaths.length ? relatedPaths.map((file) => `- ${file}`).join("\n") : "None"}

Changed file coverage in stored context:
Present:
${coverage.present.length ? coverage.present.map((file) => `- ${file}`).join("\n") : "None"}
Missing:
${coverage.missing.length ? coverage.missing.map((file) => `- ${file}`).join("\n") : "None"}

Context coverage:
Status: ${contextCoverage.status}
Score: ${contextCoverage.score}%
Resolved direct internal import targets: ${contextCoverage.resolvedInternal}
Missing direct import targets: ${contextCoverage.missing}
Missing direct import details:
${missingContextLines}
Suggested missing import targets:
${missingTargetsLines}

Risk Memory:
${riskMemoryText || "No risk memory provided."}

Project Rules:
${projectRulesText || "No project rules provided."}

${formatContextPackForPrompt(contextPack)}`,
  };
}

export function extractRiskLevel(markdown = "") {
  const text = String(markdown || "").toLowerCase();
  const riskSection = text.match(/##\s*risk level([\s\S]*?)(##|$)/i)?.[1] || text.slice(0, 800);
  if (/\bhigh\b/.test(riskSection)) return "high";
  if (/\bmedium\b/.test(riskSection)) return "medium";
  if (/\blow\b/.test(riskSection)) return "low";
  return null;
}

export function calibrateImpactAnalysisOutput({ text = "", heuristicRisk = "medium", signals = [], changeInput = "" } = {}) {
  const extracted = extractRiskLevel(text) || heuristicRisk || "medium";
  const triggers = concreteHighRiskTriggers(changeInput, signals);
  const hasConcreteHigh = triggers.length > 0;

  if (extracted !== "high") {
    return { text, riskLevel: extracted };
  }

  if (hasConcreteHigh) {
    return { text, riskLevel: "high" };
  }

  const replacement = `Medium\n\nThe initial report used High risk, but no concrete high-risk trigger was found in the submitted change. Treating this as Medium unless additional context shows security/auth, payment/billing, database/data-loss, secrets/env, destructive operations, production outage, or breaking API impact.`;
  return {
    riskLevel: "medium",
    text: replaceMarkdownSection(text, "Risk level", replacement),
  };
}
