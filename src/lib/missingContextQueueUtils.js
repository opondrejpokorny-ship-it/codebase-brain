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

export function readMissingContextQueue(projectId) {
  if (!projectId || !storageAvailable()) return [];
  const all = safeJsonParse(window.localStorage.getItem(MISSING_CONTEXT_QUEUE_KEY) || "{}", {});
  return Array.isArray(all[projectId]) ? all[projectId] : [];
}

export function writeMissingContextQueue(projectId, queue = []) {
  if (!projectId || !storageAvailable()) return [];
  const all = safeJsonParse(window.localStorage.getItem(MISSING_CONTEXT_QUEUE_KEY) || "{}", {});
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
