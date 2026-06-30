const STORAGE_KEY = "codebase_brain_project_rules_v1";

export const DEFAULT_PROJECT_RULES = [
  {
    title: "Do not invent related files",
    category: "analysis_quality",
    severity: "high",
    description: "Impact Analysis may only list graph-confirmed files in Related files. Other selected files must be listed as Context files reviewed.",
  },
  {
    title: "Do not send the whole codebase to AI",
    category: "context_policy",
    severity: "medium",
    description: "Prefer compact context packs and token efficiency. Use selected risk-relevant files instead of sending every stored file unless explicitly requested.",
  },
  {
    title: "GitHub writes are disabled by default",
    category: "github_safety",
    severity: "high",
    description: "Do not comment on PRs, approve, merge, or write to GitHub unless the user explicitly enables write actions and the app has a safe write flow.",
  },
  {
    title: "Private repo import is disabled by default",
    category: "github_safety",
    severity: "high",
    description: "Private repository import must stay disabled unless explicitly enabled. Keep private import and installation token helpers guarded by feature flags.",
  },
  {
    title: "Analysis history must not block impact analysis",
    category: "resilience",
    severity: "medium",
    description: "CodebaseAnalysis / ProjectRule entities are optional. Missing Base44 schemas must not break the core analysis flow; use local fallback when needed.",
  },
];

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

function normalizeRule(rule = {}) {
  return {
    id: rule.id || `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: String(rule.title || "Untitled rule").trim(),
    category: String(rule.category || "general").trim(),
    severity: String(rule.severity || "medium").toLowerCase(),
    description: String(rule.description || "").trim(),
    is_active: rule.is_active !== false,
    created_date: rule.created_date || new Date().toISOString(),
    updated_date: new Date().toISOString(),
    storage_source: rule.storage_source || "local_storage",
  };
}

function defaultRulesForRuntime() {
  return DEFAULT_PROJECT_RULES.map((rule, index) => ({
    ...rule,
    id: `default_rule_${index + 1}`,
    is_active: true,
    created_date: null,
    updated_date: null,
    storage_source: "default_fallback",
  }));
}

export function readLocalProjectRules(projectId) {
  if (!projectId || !storageAvailable()) return [];
  const all = safeJsonParse(window.localStorage.getItem(STORAGE_KEY) || "{}", {});
  return Array.isArray(all[projectId]) ? all[projectId] : [];
}

export function getProjectRulesForRuntime(projectId) {
  const localRules = readLocalProjectRules(projectId);
  return localRules.length ? localRules : defaultRulesForRuntime();
}

export function writeLocalProjectRules(projectId, rules = []) {
  if (!projectId || !storageAvailable()) return [];
  const all = safeJsonParse(window.localStorage.getItem(STORAGE_KEY) || "{}", {});
  all[projectId] = rules.map(normalizeRule);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return all[projectId];
}

export function addLocalProjectRule(projectId, rule) {
  const current = readLocalProjectRules(projectId);
  const next = [normalizeRule(rule), ...current];
  return writeLocalProjectRules(projectId, next);
}

export function updateLocalProjectRule(projectId, ruleId, patch = {}) {
  const current = readLocalProjectRules(projectId);
  const next = current.map((rule) => rule.id === ruleId ? normalizeRule({ ...rule, ...patch, id: rule.id, created_date: rule.created_date }) : rule);
  return writeLocalProjectRules(projectId, next);
}

export function deleteLocalProjectRule(projectId, ruleId) {
  const current = readLocalProjectRules(projectId);
  const next = current.filter((rule) => rule.id !== ruleId);
  return writeLocalProjectRules(projectId, next);
}

export function seedDefaultProjectRules(projectId) {
  const current = readLocalProjectRules(projectId);
  const existingTitles = new Set(current.map((rule) => rule.title.toLowerCase()));
  const defaults = DEFAULT_PROJECT_RULES
    .filter((rule) => !existingTitles.has(rule.title.toLowerCase()))
    .map((rule) => normalizeRule({ ...rule, storage_source: "default_seed" }));
  return writeLocalProjectRules(projectId, [...defaults, ...current]);
}

export function activeProjectRules(rules = []) {
  return rules.filter((rule) => rule?.is_active !== false && rule?.title);
}

export function formatProjectRulesForPrompt(rules = []) {
  const active = activeProjectRules(rules);
  if (!active.length) return "No project rules or ADRs are available for this project.";

  return active
    .slice(0, 30)
    .map((rule, index) => `${index + 1}. [${rule.severity || "medium"}] ${rule.title} (${rule.category || "general"})\n   ${rule.description || "No description provided."}`)
    .join("\n");
}

export function summarizeProjectRules(rules = []) {
  const active = activeProjectRules(rules);
  const severityCounts = { high: 0, medium: 0, low: 0, unknown: 0 };
  const categoryCounts = new Map();

  for (const rule of active) {
    const severity = String(rule.severity || "unknown").toLowerCase();
    if (severityCounts[severity] === undefined) severityCounts.unknown += 1;
    else severityCounts[severity] += 1;
    const category = rule.category || "general";
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
  }

  return {
    total: rules.length,
    active: active.length,
    severityCounts,
    categories: [...categoryCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  };
}
