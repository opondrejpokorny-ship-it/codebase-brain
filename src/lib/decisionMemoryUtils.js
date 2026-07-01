const STORAGE_PREFIX = "codebase-brain:decision-memory:";
const DECISION_SCHEMA_VERSION = "decision-memory-v1";

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function storageKey(projectId = "global") {
  return `${STORAGE_PREFIX}${projectId || "global"}`;
}

function parseJsonSafe(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function stableId(value = "") {
  const base = String(value || "decision").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
  return `${base || "decision"}-${Date.now()}`;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asAny(value) {
  return /** @type {any} */ (value || {});
}

function asDecision(value) {
  return /** @type {any} */ (value || {});
}

export function readDecisionMemory(projectId) {
  if (!canUseLocalStorage()) return /** @type {any[]} */ ([]);
  return /** @type {any[]} */ (parseJsonSafe(window.localStorage.getItem(storageKey(projectId)), []) || []);
}

export function writeDecisionMemory(projectId, decisions = []) {
  if (!canUseLocalStorage()) return false;
  window.localStorage.setItem(storageKey(projectId), JSON.stringify(decisions.slice(0, 200), null, 2));
  return true;
}

export function createDecisionRecord(input = {}) {
  const safeInput = asAny(input);
  const projectId = safeInput.projectId;
  const title = safeInput.title;
  const decision = safeInput.decision;
  const rationale = safeInput.rationale || "";
  const status = safeInput.status || "accepted";
  const files = asArray(safeInput.files);
  const symbols = asArray(safeInput.symbols);
  const source = safeInput.source || "manual";
  const tags = asArray(safeInput.tags);
  const createdAt = nowIso();

  return /** @type {any} */ ({
    id: stableId(title || decision),
    schema_version: DECISION_SCHEMA_VERSION,
    project_id: projectId || null,
    title: title || "Untitled decision",
    decision: decision || "",
    rationale,
    status,
    files: [...new Set(files.filter(Boolean))].slice(0, 40),
    symbols: [...new Set(symbols.filter(Boolean))].slice(0, 40),
    source,
    tags: [...new Set(tags.filter(Boolean))].slice(0, 20),
    created_date: createdAt,
    updated_date: createdAt,
  });
}

export function addDecisionMemory(projectId, decisionInput = {}) {
  const record = createDecisionRecord({ ...asAny(decisionInput), projectId });
  const current = readDecisionMemory(projectId);
  const next = [record, ...current].slice(0, 200);
  writeDecisionMemory(projectId, next);
  return record;
}

export function updateDecisionMemory(projectId, decisionId, patch = {}) {
  const current = readDecisionMemory(projectId);
  const safePatch = asAny(patch);
  const next = current.map((decision) => {
    const safeDecision = asDecision(decision);
    return safeDecision.id === decisionId ? { ...safeDecision, ...safePatch, updated_date: nowIso() } : safeDecision;
  });
  writeDecisionMemory(projectId, next);
  return next.find((decision) => asDecision(decision).id === decisionId) || null;
}

export function decisionsForFiles(decisions = [], filePaths = []) {
  const wanted = new Set(filePaths.filter(Boolean));
  if (!wanted.size) return [];
  return decisions.filter((decision) => asArray(asDecision(decision).files).some((file) => wanted.has(file)));
}

export function formatDecisionMemoryForPrompt(decisions = [], options = {}) {
  const safeOptions = asAny(options);
  const changedFiles = asArray(safeOptions.changedFiles);
  const limit = Number(safeOptions.limit || 12);
  const relevant = changedFiles.length ? decisionsForFiles(decisions, changedFiles) : decisions;
  const selected = (relevant.length ? relevant : decisions).slice(0, limit);
  if (!selected.length) return "No project decisions are stored yet.";

  return selected.map((decision) => {
    const safeDecision = asDecision(decision);
    const filesList = asArray(safeDecision.files);
    const tagsList = asArray(safeDecision.tags);
    const files = filesList.length ? `\nFiles: ${filesList.slice(0, 8).join(", ")}` : "";
    const tags = tagsList.length ? `\nTags: ${tagsList.join(", ")}` : "";
    return `- ${safeDecision.title} [${safeDecision.status || "accepted"}]\nDecision: ${safeDecision.decision}\nRationale: ${safeDecision.rationale || "Not recorded."}${files}${tags}`;
  }).join("\n");
}

export function decisionMemoryToAdrMarkdown(decision = {}) {
  const safeDecision = asAny(decision);
  const files = asArray(safeDecision.files);
  const tags = asArray(safeDecision.tags);
  return `# ADR: ${safeDecision.title || "Untitled decision"}\n\nStatus: ${safeDecision.status || "accepted"}\nDate: ${(safeDecision.created_date || nowIso()).slice(0, 10)}\n\n## Context\n\n${safeDecision.rationale || "Context was not recorded."}\n\n## Decision\n\n${safeDecision.decision || "Decision was not recorded."}\n\n## Scope\n\n${files.map((file) => `- ${file}`).join("\n") || "No files linked."}\n\n## Tags\n\n${tags.join(", ") || "None"}\n`;
}

export function buildDecisionCandidateFromImpactAnalysis(input = {}) {
  const safeInput = asAny(input);
  const result = safeInput.result || "";
  const changedFiles = asArray(safeInput.changedFiles);
  const riskLevel = safeInput.riskLevel || "medium";
  const reviewVerdict = safeInput.reviewVerdict || null;
  const safeResult = String(result || "");
  const summary = safeResult.match(/## Summary\s+([\s\S]*?)(?=\n##\s+|$)/i)?.[1]?.trim() || safeResult.slice(0, 500);
  const tests = safeResult.match(/## Recommended tests\s+([\s\S]*?)(?=\n##\s+|$)/i)?.[1]?.trim() || "";

  return createDecisionRecord({
    title: `Review follow-up: ${reviewVerdict || riskLevel}`,
    decision: summary || "Store this impact-analysis result as project memory.",
    rationale: tests ? `Recommended tests from review:\n${tests}` : "Created from an impact-analysis report.",
    status: reviewVerdict === "BLOCK" ? "proposed" : "accepted",
    files: changedFiles,
    source: "impact_analysis",
    tags: ["impact-analysis", riskLevel, reviewVerdict].filter(Boolean),
  });
}
