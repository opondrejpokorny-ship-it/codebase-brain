import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { resolveQueuedTarget } from "@/lib/focusedGithubResolve";
import { runFocusedResolveWorkflow } from "@/lib/focusedResolveWorkflow";
import { readMissingContextQueueForProject } from "@/lib/missingContextQueueUtils";

function storedPathSetForFiles(files = []) {
  return new Set(files.map((file) => String(file.path || "").replace(/^\/+/, "")));
}

export function useProjectDetail(projectId) {
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [missingContextQueue, setMissingContextQueue] = useState([]);
  const [resolvingQueue, setResolvingQueue] = useState(false);
  const [queueResolveMessage, setQueueResolveMessage] = useState("");
  const [queueResolveError, setQueueResolveError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.CodebaseProject.filter({ id: projectId }),
      base44.entities.CodeFile.filter({ project_id: projectId }),
      base44.entities.CodebaseChatMessage.filter({ project_id: projectId }, "created_date", 100),
    ])
      .then(([projects, loadedFiles, loadedMessages]) => {
        const loadedProject = projects[0] || null;
        setProject(loadedProject);
        setFiles(loadedFiles);
        setMessages(loadedMessages);
        setMissingContextQueue(readMissingContextQueueForProject(projectId, loadedProject));
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleNewMessage = (message) => {
    setMessages((prev) => [...prev, message]);
  };

  const resolveQueueFromGitHub = async () => {
    setResolvingQueue(true);
    setQueueResolveMessage("Resolving queued targets from public GitHub…");
    setQueueResolveError("");

    try {
      const storedPathSet = storedPathSetForFiles(files);
      const resolvedQueue = missingContextQueue.map((item) => resolveQueuedTarget(item, storedPathSet));
      const result = await runFocusedResolveWorkflow({
        project,
        projectId,
        files,
        queue: missingContextQueue,
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
      setQueueResolveMessage(`Imported ${result.createdFiles.length} file${result.createdFiles.length === 1 ? "" : "s"} from ${result.branch}.${suffix}`);
    } catch (error) {
      setQueueResolveError(error?.message || "Failed to resolve queued targets from public GitHub.");
      setQueueResolveMessage("");
    } finally {
      setResolvingQueue(false);
    }
  };

  const clearQueueState = () => {
    setMissingContextQueue([]);
    setQueueResolveMessage("");
    setQueueResolveError("");
  };

  const deleteProject = async () => {
    await base44.entities.CodebaseProject.delete(projectId);
    navigate("/");
  };

  return {
    project,
    files,
    messages,
    missingContextQueue,
    resolvingQueue,
    queueResolveMessage,
    queueResolveError,
    loading,
    handleNewMessage,
    resolveQueueFromGitHub,
    clearQueueState,
    deleteProject,
  };
}
