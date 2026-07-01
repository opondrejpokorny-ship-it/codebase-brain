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
    { label: "Tests changed", pattern: /(__tests__|\b(test|spec)\.(js|jsx|ts|tsx|py)\b|\.(test|spec)\.(js|jsx|ts|tsx)\b|jest|vitest|playwright|cypress|testing-library|npm test|unit tests?|regression tests?)/ },
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

export function buildImpactAnalysisPrompt({ project, files = [], changeInput = "" }) {
  const changedFiles = extractChangedFiles(changeInput);
  const relations = buildCodeRelations(files);
  const relatedPaths = relatedPathsForChangedFiles(relations, changedFiles);
  const contextPack = buildContextPack({ project, files, relations, question: changeInput, changedFiles, diffText: changeInput, maxTokens: 12000 });
  const coverage = storedFileCoverage(files, changedFiles);
  const heuristicRisk = initialRiskLevel(changeInput, changedFiles, relations);
  const signals = heuristicRiskSignals(changeInput, changedFiles);
  const confirmedRelatedInstruction = relatedPaths.length
    ? `Only these graph-confirmed related files may be listed as related files: ${relatedPaths.join(", ")}.`
    : "No graph-confirmed related files were found. In the Related files section, say 'None confirmed by the current graph/context sample'. Do not invent related files.";

  return {
    prompt: `You are Codebase Brain, a careful senior engineer reviewing a PR/diff before merge.

Rules:
- Answer only from the provided project context, selected files, submitted diff/change list, and graph relationships.
- Do not claim you ran tests.
- Use concrete file paths.
- Do not invent direct dependencies or related files. ${confirmedRelatedInstruction}

Return structured Markdown with sections: Summary, Risk level, Why this risk level, Changed files, Related files, Context files reviewed, Affected flows, Main risks, Recommended tests, Regression checklist, Missing context, Safe to merge?

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

COMPACT CONTEXT PACK:
${formatContextPackForPrompt(contextPack)}

SUBMITTED DIFF OR CHANGE LIST:
${String(changeInput || "").slice(0, 15000)}`,
    changedFiles,
    heuristicRisk,
    signals,
    relatedPaths,
    relevantRelations: contextPack.selectedRelations,
    relevantFiles: contextPack.selectedFiles,
    contextPack,
  };
}

function cleanBulletList(lines = []) {
  return lines
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 12);
}

function section(markdown = "", heading = "") {
  const text = String(markdown || "");
  const pattern = new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, "im");
  const match = text.match(pattern);
  if (!match || typeof match.index !== "number") return "";
  const start = match.index + match[0].length;
  const next = text.slice(start).search(/^##\s+/m);
  return (next >= 0 ? text.slice(start, start + next) : text.slice(start)).trim();
}

function sectionLines(markdown = "", heading = "") {
  return cleanBulletList(section(markdown, heading).split(/\r?\n/));
}

export function calibrateImpactAnalysisOutput({ text = "", heuristicRisk = "medium", signals = [], changeInput = "" }) {
  const body = String(text || "").trim();
  if (!body) return { text: "No analysis was generated.", riskLevel: heuristicRisk || "medium" };

  const declaredRisk = (section(body, "Risk level").match(/\b(high|medium|low)\b/i)?.[1] || "").toLowerCase();
  let riskLevel = declaredRisk || heuristicRisk || "medium";
  const highSignal = signals.some((signal) => /Payment|Authentication|Database|Environment|Deletion/.test(signal));
  if (highSignal && riskLevel === "low") riskLevel = "medium";
  if (signals.length >= 3 && riskLevel === "low") riskLevel = "medium";

  const changedFiles = extractChangedFiles(changeInput);
  const relatedText = section(body, "Related files");
  const contextText = section(body, "Context files reviewed");
  const confirmedRelated = changedFiles.length ? relatedText : "";
  const recommendedTests = sectionLines(body, "Recommended tests");
  const regressionChecklist = sectionLines(body, "Regression checklist");

  let calibrated = body;
  if (riskLevel !== declaredRisk && declaredRisk) {
    calibrated = replaceMarkdownSection(calibrated, "Risk level", riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1));
  }
  if (!confirmedRelated && /none/i.test(relatedText) === false) {
    calibrated = replaceMarkdownSection(calibrated, "Related files", "None confirmed by the current graph/context sample.");
  }
  if (!contextText) {
    calibrated += `\n\n## Context files reviewed\nNot available from the model output.`;
  }
  return { text: calibrated, riskLevel, recommendedTests, regressionChecklist };
}
