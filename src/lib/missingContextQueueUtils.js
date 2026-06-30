import { base44 } from "@/api/base44Client";

export const MISSING_CONTEXT_QUEUE_KEY = "codebase_brain_missing_context_queue_v1";
export const MISSING_CONTEXT_QUEUE_METADATA_KEY = "missingContextQueue";

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

async function persistQueueToProjectMetadata(projectId, queue = [], project = null) {
  if (!projectId) return;
  try {
    let latestProject = project;
    if (!latestProject) {
      const projects = await base44.entities.CodebaseProject.filter({ id: projectId }).catch(() => []);
      latestProject = projects?.[0] || null;
    }
    const metadata = importMetadataForProject(latestProject);
    await base44.entities.CodebaseProject.update(projectId, {
      import_metadata: {
        ...metadata,
        [MISSING_CONTEXT_QUEUE_METADATA_KEY]: queue,
        missingContextQueueUpdatedAt: new Date().toISOString(),
      },
    });
  } catch {
    // localStorage remains the fallback queue store.
  }
}

function normalizeQueueItem(item = {}) {
  if (!item?.target) return null;
  return {
    target: item.target,
    source_file: item.source_file || item.sourceFile || "",
    import_path: item.import_path || item.importPath || "",
    relation_type: item.relation_type || item.relationType || "missing_context",
    status: item.status || "queued",
    added_at: item.added_at || item.addedAt || new Date().toISOString(),
    resolved_at: item.resolved_at || item.resolvedAt || null,
    source_analysis_id: item.source_analysis_id || item.sourceAnalysisId || null,
  };
}

export function normalizeMissingContextQueue(queue = []) {
  return (Array.isArray(queue) ? queue : []).map(normalizeQueueItem).filter(Boolean);
}

export function dedupeMissingContextQueue(queue = []) {
  const byTarget = new Map();
  for (const item of normalizeMissingContextQueue(queue)) {
    byTarget.set(item.target, { ...(byTarget.get(item.target) || {}), ...item });
  }
  return [...byTarget.values()].sort((a, b) => String(a.target).localeCompare(String(b.target)));
}

export function importMetadataForProject(project) {
  const metadata = project?.import_metadata || project?.importMetadata || null;
  return metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};
}

export function readProjectMissingContextQueue(project) {
  const metadata = importMetadataForProject(project);
  return normalizeMissingContextQueue(metadata[MISSING_CONTEXT_QUEUE_METADATA_KEY] || metadata.missing_context_queue || []);
}

export function readMissingContextQueue(projectId) {
  if (!projectId || !storageAvailable()) return [];
  const all = readAllMissingContextQueues();
  return normalizeMissingContextQueue(Array.isArray(all[projectId]) ? all[projectId] : []);
}

export function readMissingContextQueueForProject(projectId, project = null) {
  const projectQueue = readProjectMissingContextQueue(project);
  if (projectQueue.length > 0) return projectQueue;
  return readMissingContextQueue(projectId);
}

export function readBestMissingContextQueue(projectId, project = null) {
  const projectQueue = readProjectMissingContextQueue(project);
  if (projectQueue.length > 0) return projectQueue;
  const direct = readMissingContextQueue(projectId);
  if (direct.length > 0) return direct;
  const all = readAllMissingContextQueues();
  const queues = Object.values(all).filter((queue) => Array.isArray(queue) && queue.length > 0);
  if (!queues.length) return [];
  return dedupeMissingContextQueue([...queues].sort((a, b) => b.length - a.length)[0] || []);
}

export function writeMissingContextQueue(projectId, queue = []) {
  if (!projectId || !storageAvailable()) return [];
  const all = readAllMissingContextQueues();
  all[projectId] = dedupeMissingContextQueue(queue);
  window.localStorage.setItem(MISSING_CONTEXT_QUEUE_KEY, JSON.stringify(all));
  persistQueueToProjectMetadata(projectId, all[projectId]);
  return all[projectId];
}

export async function writePersistentMissingContextQueue(projectId, queue = [], project = null) {
  const nextQueue = writeMissingContextQueue(projectId, queue);
  await persistQueueToProjectMetadata(projectId, nextQueue, project);
  return nextQueue;
}

export function clearMissingContextQueue(projectId) {
  return writeMissingContextQueue(projectId, []);
}

export async function clearPersistentMissingContextQueue(projectId, project = null) {
  return writePersistentMissingContextQueue(projectId, [], project);
}

export function missingContextQueueItem({ target, sourceFile = "", importPath = "", relationType = "missing_context", status = "queued", sourceAnalysisId = null } = {}) {
  if (!target) return null;
  return normalizeQueueItem({ target, source_file: sourceFile, import_path: importPath, relation_type: relationType, status, source_analysis_id: sourceAnalysisId, added_at: new Date().toISOString() });
}

export function addMissingContextQueueItems(projectId, items = []) {
  if (!projectId) return [];
  const current = readMissingContextQueue(projectId);
  const next = dedupeMissingContextQueue([...current, ...items]);
  return writeMissingContextQueue(projectId, next);
}

export async function addPersistentMissingContextQueueItems(projectId, items = [], project = null) {
  if (!projectId) return [];
  const current = readMissingContextQueueForProject(projectId, project);
  const next = dedupeMissingContextQueue([...current, ...items]);
  return writePersistentMissingContextQueue(projectId, next, project);
}

export function formatMissingContextQueue(queue = []) {
  return normalizeMissingContextQueue(queue).map((item) => item.target).filter(Boolean).join("\n");
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
