import { buildCodeRelations, relatedPathsForChangedFiles } from "@/lib/codeGraphUtils";
import { buildContextPack, formatContextPackForPrompt } from "@/lib/contextPackBuilder";

function normalize(value = "") {
  return String(value || "").toLowerCase().replace(/[^a-z0-9_./-]+/g, " ").trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
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
    { key: "auth", label: "Authentication or authorization", pattern: /auth|login|logout|session|jwt|token|permission|role|admin|protectedroute/ },
    { key: "database", label: "Database schema or persistence", pattern: /prisma|schema|migration|model|entity|database|db\b|sql|storage/ },
    { key: "api", label: "API or backend function", pattern: /api|route|endpoint|webhook|function|server|backend/ },
    { key: "env", label: "Environment or secrets", pattern: /\.env|secret|api_key|apikey|token|credential|process\.env|deno\.env/ },
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

  if (highSignals.length >= 2 || graphHits >= 8) return "high";
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

export function buildImpactAnalysisPrompt({ project, files = [], changeInput = "", relations = null }) {
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

  const confirmedRelatedInstruction = relatedPaths.length
    ? `Only these graph-confirmed related files may be listed as related files: ${relatedPaths.join(", ")}.`
    : "No graph-confirmed related files were found. In the Related files section, say 'None confirmed by the current graph/context sample' and then optionally list selected context files separately as 'Context files reviewed'. Do not invent related files.";

  return {
    changedFiles,
    heuristicRisk,
    signals,
    relatedPaths,
    relevantRelations: contextPack.selectedRelations,
    relevantFiles: contextPack.selectedFiles,
    contextPack,
    prompt: `You are Codebase Brain, a careful senior engineer reviewing a PR/diff before merge.\n\nRules:\n- Write the entire report in English only. Do not use Czech, Chinese, or any other language.\n- If the input or context contains non-English text, translate the meaning into English before writing the report.\n- Answer only from the provided project context, selected files, submitted diff/change list, and graph relationships.\n- Do not claim you ran tests.\n- Always mention missing context.\n- Use concrete file paths.\n- Be practical and concise.\n- Do not invent direct dependencies or related files. ${confirmedRelatedInstruction}\n- If a changed file is not present in the stored project sample, say so clearly in Missing context.\n\nReturn structured Markdown with exactly these sections:\n\n## Summary\nShort explanation of the change.\n\n## Risk level\nLow / Medium / High\n\n## Why this risk level\nBullet points.\n\n## Changed files\nList changed files. Mark files missing from stored context when applicable.\n\n## Related files\nOnly graph-confirmed related files. If none are confirmed, say none confirmed.\n\n## Context files reviewed\nList selected context files and why they were selected.\n\n## Affected flows\nUser-facing or backend flows that may be affected.\n\n## Main risks\nConcrete risks.\n\n## Recommended tests\nManual and automated tests to run.\n\n## Regression checklist\nStep-by-step checklist before merge.\n\n## Missing context\nWhat the system could not know from imported files.\n\n## Safe to merge?\nOne of:\n- Looks safe after listed checks\n- Needs review\n- High risk, do not merge without deeper review\n\nPROJECT:\nName: ${project?.name || "Unknown"}\nRepository URL: ${project?.repository_url || "Not provided"}\nDetected stack: ${(project?.detected_stack || []).join(", ") || "Unknown"}\n\nDETERMINISTIC PRE-SCAN:\nChanged files detected: ${changedFiles.length ? changedFiles.join(", ") : "None detected from input"}\nChanged files present in stored sample: ${coverage.present.length ? coverage.present.join(", ") : "None"}\nChanged files missing from stored sample: ${coverage.missing.length ? coverage.missing.join(", ") : "None"}\nInitial heuristic risk: ${heuristicRisk}\nRisk signals: ${signals.length ? signals.join(", ") : "None"}\nGraph-confirmed related files: ${relatedPaths.length ? relatedPaths.join(", ") : "None"}\nSelected context files reviewed:\n${selectedFileReasons(contextPack) || "None"}\nContext token estimate: selected ${contextPack.efficiency.selectedTokens}, full repo estimate ${contextPack.efficiency.fullRepoTokens}, estimated savings ${contextPack.efficiency.savingsPercent}%\n\nCOMPACT CONTEXT PACK:\n${formatContextPackForPrompt(contextPack)}\n\nSUBMITTED DIFF OR CHANGE LIST:\n${String(changeInput || "").slice(0, 15000)}`,
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
