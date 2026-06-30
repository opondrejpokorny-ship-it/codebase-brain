import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { queueItemForStorage, resolveQueuedTarget } from "@/lib/focusedGithubResolve";
import { runFocusedResolveWorkflow } from "@/lib/focusedResolveWorkflow";
import { readBestMissingContextQueue } from "@/lib/missingContextQueueUtils";
import {
  clearPersistentMissingContextQueue,
  writePersistentMissingContextQueue,
} from "@/lib/persistentMissingContextQueue";

function storedPathSetForFiles(files = []) {
  return new Set(files.map((file) => String(file.path || "").replace(/^\/+/, "")));
}

export function useMissingContextImportQueue(projectId) {
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [projects, storedFiles] = await Promise.all([
          base44.entities.CodebaseProject.filter({ id: projectId }).catch(() => []),
          base44.entities.CodeFile.filter({ project_id: projectId }).catch(() => []),
        ]);
        const loadedProject = projects?.[0] || null;
        if (!cancelled) {
          setProject(loadedProject);
          setFiles(storedFiles || []);
          setQueue(readBestMissingContextQueue(projectId, loadedProject));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [projectId]);

  const storedPathSet = useMemo(() => storedPathSetForFiles(files), [files]);
  const resolvedQueue = useMemo(() => queue.map((item) => resolveQueuedTarget(item, storedPathSet)), [queue, storedPathSet]);
  const indexedCount = resolvedQueue.filter((item) => item.status === "indexed").length;
  const missingCount = Math.max(0, resolvedQueue.length - indexedCount);
  const hasResolvedTargets = indexedCount > 0;
  const canResolve = Boolean(project?.repository_url) && missingCount > 0 && !resolving;

  const updateLocalProjectQueue = (nextQueue) => {
    setProject((prev) => prev ? {
      ...prev,
      import_metadata: {
        ...(prev.import_metadata || prev.importMetadata || {}),
        missingContextQueue: nextQueue,
        missingContextQueueUpdatedAt: new Date().toISOString(),
      },
    } : prev);
  };

  const resolveFromGitHub = async () => {
    setResolving(true);
    setMessage("Resolving queued targets from GitHub…");
    setError("");
    try {
      const result = await runFocusedResolveWorkflow({
        project,
        projectId,
        files,
        queue,
        resolvedQueue,
        storedPathSet,
      });
      setFiles(result.nextFiles);
      setProject((prev) => ({
        ...(prev || {}),
        status: result.nextProjectStatus,
        import_metadata: result.nextImportMetadata,
      }));
      const suffix = result.misses.length ? ` ${result.misses.length} target${result.misses.length === 1 ? "" : "s"} still not found.` : "";
      setMessage(`Imported ${result.createdFiles.length} file${result.createdFiles.length === 1 ? "" : "s"} from ${result.branch}.${suffix}`);
    } catch (err) {
      setError(err?.message || "Failed to resolve queued targets from GitHub.");
      setMessage("");
    } finally {
      setResolving(false);
    }
  };

  const clearResolved = async () => {
    const remaining = resolvedQueue.filter((item) => item.status !== "indexed").map(queueItemForStorage);
    const next = await writePersistentMissingContextQueue(projectId, remaining, project);
    setQueue(next);
    updateLocalProjectQueue(next);
    setError("");
    setMessage(remaining.length ? `Cleared resolved targets. ${remaining.length} still queued.` : "All resolved targets cleared from the queue.");
  };

  const clearQueue = async () => {
    const next = await clearPersistentMissingContextQueue(projectId, project);
    setQueue(next);
    updateLocalProjectQueue(next);
    setMessage("");
    setError("");
  };

  return {
    project,
    files,
    queue,
    loading,
    resolving,
    message,
    error,
    resolvedQueue,
    indexedCount,
    missingCount,
    hasResolvedTargets,
    canResolve,
    resolveFromGitHub,
    clearResolved,
    clearQueue,
  };
}
