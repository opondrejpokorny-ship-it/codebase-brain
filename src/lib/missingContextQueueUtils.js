export const MISSING_CONTEXT_QUEUE_KEY = "codebase_brain_missing_context_queue_v1";

function storageAvailable() {
  try {
    return typeof window !== "undefined" && Boolean(window.localStorage);
  } catch {
    return false;
  }
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function readAllMissingContextQueues() {
  if (!storageAvailable()) return {};
  return safeJsonParse(window.localStorage.getItem(MISSING_CONTEXT_QUEUE_KEY) || "{}", {});
}

export function readMissingContextQueue(projectId) {
  if (!projectId || !storageAvailable()) return [];
  const all = readAllMissingContextQueues();
  return Array.isArray(all[projectId]) ? all[projectId] : [];
}

export function readBestMissingContextQueue(projectId) {
  const direct = readMissingContextQueue(projectId);
  if (direct.length > 0) return direct;

  const all = readAllMissingContextQueues();
  const queues = Object.values(all).filter((queue) => Array.isArray(queue) && queue.length > 0);
  if (!queues.length) return [];

  return [...queues].sort((a, b) => b.length - a.length)[0] || [];
}

export function writeMissingContextQueue(projectId, queue = []) {
  if (!projectId || !storageAvailable()) return [];
  const all = readAllMissingContextQueues();
  all[projectId] = Array.isArray(queue) ? queue : [];
  window.localStorage.setItem(MISSING_CONTEXT_QUEUE_KEY, JSON.stringify(all));
  return all[projectId];
}

export function clearMissingContextQueue(projectId) {
  return writeMissingContextQueue(projectId, []);
}

export function missingContextQueueItem({ target, sourceFile = "", importPath = "", relationType = "missing_context" } = {}) {
  if (!target) return null;
  return {
    target,
    source_file: sourceFile,
    import_path: importPath,
    relation_type: relationType,
    added_at: new Date().toISOString(),
  };
}

export function addMissingContextQueueItems(projectId, items = []) {
  if (!projectId) return [];
  const current = readMissingContextQueue(projectId);
  const byTarget = new Map(current.map((item) => [item.target, item]));

  for (const item of items) {
    if (!item?.target) continue;
    byTarget.set(item.target, {
      ...(byTarget.get(item.target) || {}),
      ...item,
    });
  }

  const next = [...byTarget.values()].sort((a, b) => String(a.target).localeCompare(String(b.target)));
  return writeMissingContextQueue(projectId, next);
}

export function formatMissingContextQueue(queue = []) {
  return queue.map((item) => item.target).filter(Boolean).join("\n");
}

export function formatMissingContextImportPrompt({ projectName = "this project", repositoryUrl = "", queue = [] } = {}) {
  const targets = formatMissingContextQueue(queue);
  return `Import or re-index these missing context targets for ${projectName}.

Repository: ${repositoryUrl || "not provided"}

Targets:
${targets || "None"}

Instructions:
- Prefer exact repository files matching these extensionless targets.
- Resolve common extensions: .js, .jsx, .ts, .tsx.
- Also check index files under matching folders.
- Add the resolved files to the stored project context.
- Rebuild code graph relations after import.
- Do not import the whole repository unless explicitly requested.`;
}
