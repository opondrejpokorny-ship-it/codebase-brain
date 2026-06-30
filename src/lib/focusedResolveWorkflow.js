import { base44 } from "@/api/base44Client";
import { persistCodeRelationsIfAvailable } from "@/lib/codeRelationPersistence";
import { resolveQueuedFilesFromPublicGitHub } from "@/lib/focusedGithubResolve";
import { appendFocusedResolveMetadata, buildFocusedResolveRecord } from "@/lib/importMetadataUtils";

export async function runFocusedResolveWorkflow({
  project,
  projectId,
  files = [],
  queue = [],
  resolvedQueue = [],
  storedPathSet,
} = {}) {
  const result = await resolveQueuedFilesFromPublicGitHub({
    repositoryUrl: project?.repository_url || "",
    projectId,
    resolvedQueue,
    storedPathSet,
  });

  const createdFiles = [];
  for (const file of result.filesToCreate) {
    const created = await base44.entities.CodeFile.create(file);
    createdFiles.push(created || file);
  }

  const nextFiles = [...files, ...createdFiles];
  const resolveRecord = buildFocusedResolveRecord({
    branch: result.branch,
    createdFiles,
    misses: result.misses,
    queuedCount: queue.length,
  });
  const nextImportMetadata = appendFocusedResolveMetadata(project?.import_metadata || project?.importMetadata, resolveRecord);
  const nextProjectStatus = createdFiles.length > 0 ? "indexed" : project?.status || "indexed";

  try {
    await base44.entities.CodebaseProject.update(projectId, {
      status: nextProjectStatus,
      import_metadata: nextImportMetadata,
    });
  } catch {
    // The created CodeFiles should remain visible even if project metadata update fails.
  }

  try {
    if (createdFiles.length > 0) {
      await persistCodeRelationsIfAvailable({ projectId, files: nextFiles });
    }
  } catch {
    // Focused resolve should not be treated as failed when relation rebuild is unavailable.
  }

  return {
    ...result,
    createdFiles,
    nextFiles,
    nextImportMetadata,
    nextProjectStatus,
    resolveRecord,
  };
}
