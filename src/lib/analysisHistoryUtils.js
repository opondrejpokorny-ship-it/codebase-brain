const STORAGE_KEY = "codebase_brain_analysis_history_v1";
const MAX_LOCAL_RECORDS_PER_PROJECT = 80;
export const CURRENT_RISK_CALIBRATION_VERSION = 2;

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function storageAvailable() {
  try {
    return typeof window !== "undefined" && Boolean(window.localStorage);
  } catch {
    return false;
  }
}

function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return [];
}

function escapeRegExp(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function riskCalibrationVersion(analysis = {}) {
  return Number(analysis.risk_calibration_version || analysis.riskCalibrationVersion || 1);
}

function isCurrentRiskCalibration(analysis = {}) {
  return riskCalibrationVersion(analysis) >= CURRENT_RISK_CALIBRATION_VERSION;
}

export function extractMarkdownSection(markdown = "", heading = "") {
  const text = String(markdown || "");
  if (!heading) return "";
  const pattern = new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, "im");
  const match = text.match(pattern);
  if (!match || typeof match.index !== "number") return "";

  const start = match.index + match[0].length;
  const next = text.slice(start).search(/^##\s+/m);
  const section = next >= 0 ? text.slice(start, start + next) : text.slice(start);
  return section.trim();
}

export function sectionLines(markdown = "", heading = "", max = 8) {
  return extractMarkdownSection(markdown, heading)
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, "").replace(/^\[[ xX]\]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, max);
}

export function readLocalAnalysisHistory(projectId) {
  if (!projectId || !storageAvailable()) return [];
  const all = safeJsonParse(window.localStorage.getItem(STORAGE_KEY) || "{}", {});
  return Array.isArray(all[projectId]) ? all[projectId] : [];
}

export function writeLocalAnalysisRecord(projectId, record) {
  if (!projectId || !record || !storageAvailable()) return null;
  const all = safeJsonParse(window.localStorage.getItem(STORAGE_KEY) || "{}", {});
  const current = Array.isArray(all[projectId]) ? all[projectId] : [];
  const normalized = {
    ...record,
    id: record.id || `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    project_id: projectId,
    storage_source: record.storage_source || "local_storage",
    created_date: record.created_date || new Date().toISOString(),
  };
  all[projectId] = [normalized, ...current]
    .filter((item, index, arr) => arr.findIndex((candidate) => candidate.id === item.id) === index)
    .slice(0, MAX_LOCAL_RECORDS_PER_PROJECT);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return normalized;
}

export function mergeAnalysisHistories(...groups) {
  return groups
    .flat()
    .filter(Boolean)
    .filter((item, index, arr) => {
      const key = item.id || `${item.created_date}|${item.input || ""}`;
      return arr.findIndex((candidate) => (candidate.id || `${candidate.created_date}|${candidate.input || ""}`) === key) === index;
    })
    .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
}

export function createAnalysisHistoryRecord({
  projectId,
  type,
  input,
  result,
  riskLevel,
  changedFiles,
  relatedFiles,
  riskSignals,
  relevantFiles,
  relevantRelations,
  contextPack,
  repositoryCompatibility,
  prMetadata,
}) {
  const efficiency = contextPack?.efficiency || {};
  return {
    project_id: projectId,
    type: type || "manual_diff_impact",
    input: String(input || ""),
    result: String(result || ""),
    risk_level: riskLevel || "medium",
    risk_calibration_version: CURRENT_RISK_CALIBRATION_VERSION,
    changed_files: normalizeList(changedFiles),
    related_files: normalizeList(relatedFiles),
    risk_signals: normalizeList(riskSignals),
    relevant_files: normalizeList(relevantFiles),
    relevant_relations: normalizeList(relevantRelations),
    repository_compatibility: repositoryCompatibility || null,
    pr_metadata: prMetadata || null,
    selected_tokens: efficiency.selectedTokens || 0,
    full_repo_tokens: efficiency.fullRepoTokens || 0,
    saved_tokens: efficiency.savedTokens || 0,
    savings_percent: efficiency.savingsPercent || 0,
    recommended_tests: sectionLines(result, "Recommended tests", 12),
    regression_checklist: sectionLines(result, "Regression checklist", 12),
    created_date: new Date().toISOString(),
  };
}

function increment(map, key, amount = 1) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + amount);
}

function sortedCounts(map, limit = 10) {
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export function buildRiskMemory(analyses = []) {
  const highRiskFiles = new Map();
  const legacyHighRiskFiles = new Map();
  const changedFiles = new Map();
  const relatedFiles = new Map();
  const riskSignals = new Map();
  const recommendedTests = new Map();
  const riskCounts = { high: 0, medium: 0, low: 0, unknown: 0 };
  const calibratedRiskCounts = { high: 0, medium: 0, low: 0, unknown: 0 };
  const legacyRiskCounts = { high: 0, medium: 0, low: 0, unknown: 0 };

  for (const analysis of analyses) {
    const risk = String(analysis.risk_level || "unknown").toLowerCase();
    const calibrated = isCurrentRiskCalibration(analysis);
    const targetCounts = calibrated ? calibratedRiskCounts : legacyRiskCounts;

    if (riskCounts[risk] === undefined) riskCounts.unknown += 1;
    else riskCounts[risk] += 1;

    if (targetCounts[risk] === undefined) targetCounts.unknown += 1;
    else targetCounts[risk] += 1;

    for (const file of normalizeList(analysis.changed_files)) {
      increment(changedFiles, file);
      if (risk === "high" && calibrated) increment(highRiskFiles, file);
      if (risk === "high" && !calibrated) increment(legacyHighRiskFiles, file);
    }
    for (const file of normalizeList(analysis.related_files)) increment(relatedFiles, file);
    for (const signal of normalizeList(analysis.risk_signals)) increment(riskSignals, signal);
    for (const test of normalizeList(analysis.recommended_tests || sectionLines(analysis.result, "Recommended tests", 8))) increment(recommendedTests, test);
  }

  return {
    totalAnalyses: analyses.length,
    currentCalibrationVersion: CURRENT_RISK_CALIBRATION_VERSION,
    calibratedAnalyses: analyses.filter(isCurrentRiskCalibration).length,
    legacyAnalyses: analyses.filter((analysis) => !isCurrentRiskCalibration(analysis)).length,
    riskCounts,
    calibratedRiskCounts,
    legacyRiskCounts,
    highRiskFiles: sortedCounts(highRiskFiles, 8),
    legacyHighRiskFiles: sortedCounts(legacyHighRiskFiles, 8),
    frequentlyChangedFiles: sortedCounts(changedFiles, 10),
    frequentlyRelatedFiles: sortedCounts(relatedFiles, 10),
    repeatedRiskSignals: sortedCounts(riskSignals, 10),
    commonRecommendedTests: sortedCounts(recommendedTests, 8),
  };
}

function formatCountList(items = [], fallback = "None") {
  if (!items.length) return fallback;
  return items.map((item) => `- ${item.name}: ${item.count}x`).join("\n");
}

export function formatRiskMemoryForPrompt(analyses = [], changedFiles = [], relatedFiles = [], riskSignals = []) {
  const memory = buildRiskMemory(analyses);
  const changed = new Set(normalizeList(changedFiles));
  const related = new Set(normalizeList(relatedFiles));
  const signals = new Set(normalizeList(riskSignals));

  const matchingChangedFiles = memory.frequentlyChangedFiles.filter((item) => changed.has(item.name));
  const matchingHighRiskFiles = memory.highRiskFiles.filter((item) => changed.has(item.name) || related.has(item.name));
  const matchingLegacyHighRiskFiles = memory.legacyHighRiskFiles.filter((item) => changed.has(item.name) || related.has(item.name));
  const matchingRiskSignals = memory.repeatedRiskSignals.filter((item) => signals.has(item.name));

  if (!memory.totalAnalyses) {
    return "No previous impact analyses are available for this project.";
  }

  return `Previous impact analyses available: ${memory.totalAnalyses}
Current risk calibration version: ${memory.currentCalibrationVersion}
Calibrated analyses: ${memory.calibratedAnalyses}
Legacy analyses from older calibration: ${memory.legacyAnalyses}
All-time risk distribution: high ${memory.riskCounts.high}, medium ${memory.riskCounts.medium}, low ${memory.riskCounts.low}
Calibrated risk distribution: high ${memory.calibratedRiskCounts.high}, medium ${memory.calibratedRiskCounts.medium}, low ${memory.calibratedRiskCounts.low}
Legacy high-risk labels are advisory only and must not by themselves raise current risk.

Changed files that appear repeatedly in history:
${formatCountList(matchingChangedFiles)}

Changed or related files that previously appeared in calibrated high-risk analyses:
${formatCountList(matchingHighRiskFiles)}

Changed or related files that previously appeared in legacy high-risk analyses:
${formatCountList(matchingLegacyHighRiskFiles)}

Risk signals repeated in history:
${formatCountList(matchingRiskSignals)}

Most frequent changed files overall:
${formatCountList(memory.frequentlyChangedFiles.slice(0, 5))}

Common recommended tests from previous analyses:
${formatCountList(memory.commonRecommendedTests.slice(0, 5))}`;
}
