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

function normalizeChangedSymbols(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((symbol) => ({
      name: String(symbol?.name || ""),
      type: String(symbol?.type || ""),
      path: String(symbol?.path || ""),
      line: Number(symbol?.line || 0) || null,
      exported: Boolean(symbol?.exported),
    }))
    .filter((symbol) => symbol.name && symbol.path);
}

function symbolMemoryName(symbol = {}) {
  const type = symbol.type ? ` ${symbol.type}` : "";
  return `${symbol.name}${type} · ${symbol.path}`;
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

function historyTime(value) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
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
    .sort((a, b) => historyTime(b.created_date) - historyTime(a.created_date));
}

export function createAnalysisHistoryRecord(input = {}) {
  const {
    projectId,
    type,
    input: rawInput,
    result,
    riskLevel,
    changedFiles,
    changedSymbols,
    relatedFiles,
    riskSignals,
    relevantFiles,
    relevantRelations,
    contextPack,
    contextDepth,
    contextDepthPreset,
    contextSelectedTokens,
    contextTotalTokens,
    contextFullRepoTokens,
    contextSavingsPercent,
    repositoryCompatibility,
    prMetadata,
  } = /** @type {any} */ (input);
  const efficiency = contextPack?.efficiency || {};
  const selectedTokens = contextSelectedTokens || efficiency.selectedFileTokens || efficiency.selectedTokens || 0;
  const totalTokens = contextTotalTokens || efficiency.totalContextTokens || efficiency.selectedTotalTokens || selectedTokens;
  const fullRepoTokens = contextFullRepoTokens || efficiency.fullRepoTokens || 0;
  const savingsPercent = contextSavingsPercent || efficiency.savingsPercent || 0;
  return {
    project_id: projectId,
    type: type || "manual_diff_impact",
    input: String(rawInput || ""),
    result: String(result || ""),
    risk_level: riskLevel || "medium",
    risk_calibration_version: CURRENT_RISK_CALIBRATION_VERSION,
    changed_files: normalizeList(changedFiles),
    changed_symbols: normalizeChangedSymbols(changedSymbols),
    related_files: normalizeList(relatedFiles),
    risk_signals: normalizeList(riskSignals),
    relevant_files: normalizeList(relevantFiles),
    relevant_relations: normalizeList(relevantRelations),
    repository_compatibility: repositoryCompatibility || null,
    pr_metadata: prMetadata || null,
    context_depth: contextDepth || contextPack?.depth || "balanced",
    context_depth_preset: contextDepthPreset || contextPack?.depthPreset || "Balanced",
    context_selected_tokens: selectedTokens,
    context_total_tokens: totalTokens,
    context_full_repo_tokens: fullRepoTokens,
    context_savings_percent: savingsPercent,
    selected_tokens: selectedTokens,
    full_repo_tokens: fullRepoTokens,
    saved_tokens: efficiency.savedTokens || 0,
    savings_percent: savingsPercent,
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
  const changedSymbols = new Map();
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
    for (const symbol of normalizeChangedSymbols(analysis.changed_symbols)) increment(changedSymbols, symbolMemoryName(symbol));
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
    frequentlyChangedSymbols: sortedCounts(changedSymbols, 10),
    frequentlyRelatedFiles: sortedCounts(relatedFiles, 10),
    repeatedRiskSignals: sortedCounts(riskSignals, 10),
    commonRecommendedTests: sortedCounts(recommendedTests, 8),
  };
}

function formatCountList(items = [], fallback = "None") {
  if (!items.length) return fallback;
  return items.map((item) => `- ${item.name}: ${item.count}x`).join("\n");
}

export function formatRiskMemoryForPrompt(analyses = [], changedFiles = [], relatedFiles = [], riskSignals = [], changedSymbols = []) {
  const memory = buildRiskMemory(analyses);
  const changed = new Set(normalizeList(changedFiles));
  const related = new Set(normalizeList(relatedFiles));
  const signals = new Set(normalizeList(riskSignals));
  const symbolKeys = new Set(normalizeChangedSymbols(changedSymbols).map(symbolMemoryName));

  const matchingChangedFiles = memory.frequentlyChangedFiles.filter((item) => changed.has(item.name));
  const matchingChangedSymbols = memory.frequentlyChangedSymbols.filter((item) => symbolKeys.has(item.name));
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
Current-calibration risk distribution: high ${memory.calibratedRiskCounts.high}, medium ${memory.calibratedRiskCounts.medium}, low ${memory.calibratedRiskCounts.low}
Relevant frequently changed files:
${formatCountList(matchingChangedFiles)}
Relevant frequently changed symbols:
${formatCountList(matchingChangedSymbols)}
Frequently changed symbols overall:
${formatCountList(memory.frequentlyChangedSymbols.slice(0, 8))}
Relevant calibrated high-risk files:
${formatCountList(matchingHighRiskFiles)}
Relevant legacy high-risk files, lower confidence:
${formatCountList(matchingLegacyHighRiskFiles)}
Repeated matching risk signals:
${formatCountList(matchingRiskSignals)}`;
}
