import { base44 } from "@/api/base44Client";
import {
  dedupeMissingContextQueue,
  importMetadataForProject,
  readMissingContextQueueForProject,
  writeMissingContextQueue,
} from "@/lib/missingContextQueueUtils";

export const PERSISTENT_MISSING_CONTEXT_QUEUE_KEY = "missingContextQueue";

async function fetchProject(projectId) {
  if (!projectId) return null;
  try {
    const projects = await base44.entities.CodebaseProject.filter({ id: projectId }).catch(() => []);
    return projects?.[0] || null;
  } catch {
    return null;
  }
}

export async function writePersistentMissingContextQueue(projectId, queue = [], project = null) {
  const nextQueue = writeMissingContextQueue(projectId, queue);
  if (!projectId) return nextQueue;

  try {
    const latestProject = project || await fetchProject(projectId);
    const metadata = importMetadataForProject(latestProject);
    await base44.entities.CodebaseProject.update(projectId, {
      import_metadata: {
        ...metadata,
        [PERSISTENT_MISSING_CONTEXT_QUEUE_KEY]: nextQueue,
        missingContextQueueUpdatedAt: new Date().toISOString(),
      },
    });
  } catch {
    // localStorage remains the fallback queue store.
  }

  return nextQueue;
}

export async function addPersistentMissingContextQueueItems(projectId, items = [], project = null) {
  if (!projectId) return [];
  const latestProject = project || await fetchProject(projectId);
  const current = readMissingContextQueueForProject(projectId, latestProject);
  const next = dedupeMissingContextQueue([...current, ...items]);
  return writePersistentMissingContextQueue(projectId, next, latestProject);
}

export async function clearPersistentMissingContextQueue(projectId, project = null) {
  return writePersistentMissingContextQueue(projectId, [], project);
}
