import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Check, ClipboardCopy, DownloadCloud, FileCode, FileDiff, Layers, Loader2, PackageSearch, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import ChatBox from "@/components/projects/ChatBox";
import CodeRelationsCard from "@/components/projects/CodeRelationsCard";
import ImportMetadataCard from "@/components/projects/ImportMetadataCard";
import { resolveQueuedTarget } from "@/lib/focusedGithubResolve";
import { runFocusedResolveWorkflow } from "@/lib/focusedResolveWorkflow";
import {
  clearMissingContextQueue,
  formatMissingContextImportPrompt,
  formatMissingContextQueue,
  readMissingContextQueue,
} from "@/lib/missingContextQueueUtils";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const statusStyles = {
  draft: "bg-amber-50 text-amber-700 border-amber-200",
  indexed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  url_only: "bg-blue-50 text-blue-700 border-blue-200",
  error: "bg-red-50 text-red-700 border-red-200",
};

const langColors = {
  JavaScript: "bg-yellow-100 text-yellow-800",
  TypeScript: "bg-blue-100 text-blue-800",
  Python: "bg-green-100 text-green-800",
  CSS: "bg-purple-100 text-purple-800",
  HTML: "bg-orange-100 text-orange-800",
  JSON: "bg-slate-100 text-slate-600",
};

function queueStatusBadgeClass(status) {
  if (status === "indexed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

function storedPathSetForFiles(files = []) {
  return new Set(files.map((file) => String(file.path || "").replace(/^\/+/, "")));
}

function resolveQueueAgainstFiles(queue = [], files = []) {
  const storedPathSet = storedPathSetForFiles(files);
  return queue.map((item) => resolveQueuedTarget(item, storedPathSet));
}

function MissingContextQueueCard({
  project,
  projectId,
  queue = [],
  files = [],
  resolving = false,
  resolveMessage = "",
  resolveError = "",
  onResolve,
  onClear,
}) {
  const [copied, setCopied] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  if (!queue.length) return null;

  const resolvedQueue = resolveQueueAgainstFiles(queue, files);
  const indexedCount = resolvedQueue.filter((item) => item.status === "indexed").length;
  const missingCount = Math.max(0, resolvedQueue.length - indexedCount);
  const canResolve = Boolean(project?.repository_url) && missingCount > 0 && !resolving;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatMissingContextQueue(queue));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(
        formatMissingContextImportPrompt({
          projectName: project?.name || "this project",
          repositoryUrl: project?.repository_url || "",
          queue,
        })
      );
      setCopiedPrompt(true);
      window.setTimeout(() => setCopiedPrompt(false), 1600);
    } catch {
      setCopiedPrompt(false);
    }
  };

  const handleClear = () => {
    clearMissingContextQueue(projectId);
    onClear?.();
    setCopied(false);
    setCopiedPrompt(false);
  };

  return (
    <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
        <div>
          <h2 className="font-heading font-semibold text-sm text-amber-900 flex items-center gap-2">
            <PackageSearch className="w-4 h-4" />
            Missing Context Import Queue
          </h2>
          <p className="text-xs text-amber-700 mt-1">
            {queue.length} target{queue.length === 1 ? "" : "s"} queued from Impact Analysis for the next import or re-index step.
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Badge variant="outline" className="bg-white/70 text-amber-800 border-amber-200">
              {indexedCount}/{queue.length} resolved
            </Badge>
            {missingCount > 0 && (
              <Badge variant="outline" className="bg-white/70 text-amber-800 border-amber-200">
                {missingCount} still missing
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onResolve} disabled={!canResolve} className="cursor-pointer gap-1.5 bg-white/70">
            {resolving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DownloadCloud className="w-3.5 h-3.5" />}
            {resolving ? "Resolving…" : "Resolve from GitHub"}
          </Button>
          <Link to={`/project/${projectId}/import-queue`}>
            <Button type="button" variant="outline" size="sm" className="cursor-pointer gap-1.5 bg-white/70">
              <PackageSearch className="w-3.5 h-3.5" />
              Open checklist
            </Button>
          </Link>
          <Button type="button" variant="outline" size="sm" onClick={handleCopyPrompt} className="cursor-pointer gap-1.5 bg-white/70">
            {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
            {copiedPrompt ? "Prompt copied" : "Copy import prompt"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="cursor-pointer gap-1.5 bg-white/70">
            {copied ? <Check className="w-3.5 h-3.5" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy queue"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleClear} className="cursor-pointer bg-white/70">
            Clear queue
          </Button>
        </div>
      </div>

      {resolveMessage && <p className="text-xs text-emerald-700 bg-white/70 border border-emerald-100 rounded-md px-3 py-2 mb-3">{resolveMessage}</p>}
      {resolveError && <p className="text-xs text-red-700 bg-white/70 border border-red-100 rounded-md px-3 py-2 mb-3">{resolveError}</p>}

      <div className="grid sm:grid-cols-2 gap-1.5">
        {resolvedQueue.map((item) => (
          <div key={item.target} className="bg-white/60 rounded-md px-2 py-1.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-mono text-amber-800 break-all">{item.target}</p>
              <Badge variant="outline" className={`${queueStatusBadgeClass(item.status)} flex-shrink-0 text-[10px] px-1.5 py-0`}>
                {item.status === "indexed" ? "Indexed" : "Missing"}
              </Badge>
            </div>
            {item.matchedPath && <p className="text-[10px] text-emerald-700 mt-1 break-all">{item.matchedPath}</p>}
          </div>
        ))}
      </div>
      <p className="text-xs text-amber-700 mt-3">
        Resolve missing targets here, or open the checklist to clear resolved items and rerun Impact Analysis.
      </p>
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
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
      base44.entities.CodebaseProject.filter({ id }),
      base44.entities.CodeFile.filter({ project_id: id }),
      base44.entities.CodebaseChatMessage.filter({ project_id: id }, "created_date", 100),
    ])
      .then(([projects, files, msgs]) => {
        setProject(projects[0] || null);
        setFiles(files);
        setMessages(msgs);
        setMissingContextQueue(readMissingContextQueue(id));
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleNewMessage = (msg) => {
    setMessages((prev) => [...prev, msg]);
  };

  const handleResolveQueueFromGitHub = async () => {
    setResolvingQueue(true);
    setQueueResolveMessage("Resolving queued targets from public GitHub…");
    setQueueResolveError("");

    try {
      const storedPathSet = storedPathSetForFiles(files);
      const resolvedQueue = missingContextQueue.map((item) => resolveQueuedTarget(item, storedPathSet));
      const result = await runFocusedResolveWorkflow({
        project,
        projectId: id,
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

      const missSuffix = result.misses.length ? ` ${result.misses.length} target${result.misses.length === 1 ? "" : "s"} still not found.` : "";
      setQueueResolveMessage(`Imported ${result.createdFiles.length} file${result.createdFiles.length === 1 ? "" : "s"} from ${result.branch}.${missSuffix}`);
    } catch (error) {
      setQueueResolveError(error?.message || "Failed to resolve queued targets from public GitHub.");
      setQueueResolveMessage("");
    } finally {
      setResolvingQueue(false);
    }
  };

  const handleDelete = async () => {
    await base44.entities.CodebaseProject.delete(id);
    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Project not found.</p>
        <Link to="/" className="text-sm text-slate-900 underline mt-2 inline-block cursor-pointer">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors duration-150 cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" />
          Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <Link to={`/project/${id}/impact`}>
            <Button variant="outline" size="sm" className="cursor-pointer gap-1.5">
              <FileDiff className="w-3.5 h-3.5" />
              Impact Analysis
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer gap-1.5">
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete project?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{project.name}" and all its files and chat history.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 cursor-pointer">
                  Delete Project
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Project header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-heading text-xl font-bold text-slate-900 truncate">{project.name}</h1>
              <Badge variant="outline" className={statusStyles[project.status] || statusStyles.draft}>
                {project.status}
              </Badge>
            </div>
            {project.repository_url && (
              <a
                href={project.repository_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline cursor-pointer"
              >
                {project.repository_url}
              </a>
            )}
          </div>
        </div>

        {project.detected_stack?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {project.detected_stack.map((tech) => (
              <span key={tech} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-medium">
                {tech}
              </span>
            ))}
          </div>
        )}

        {project.summary && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Project Summary</h3>
            <p className="text-sm text-slate-700 leading-relaxed">{project.summary}</p>
          </div>
        )}
      </div>

      <ImportMetadataCard project={project} />
      <MissingContextQueueCard
        project={project}
        projectId={id}
        queue={missingContextQueue}
        files={files}
        resolving={resolvingQueue}
        resolveMessage={queueResolveMessage}
        resolveError={queueResolveError}
        onResolve={handleResolveQueueFromGitHub}
        onClear={() => {
          setMissingContextQueue([]);
          setQueueResolveMessage("");
          setQueueResolveError("");
        }}
      />
      <CodeRelationsCard files={files} />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Files */}
        <div>
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5" />
            Files ({files.length})
          </h2>
          {files.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No files indexed yet.</p>
              <p className="text-xs text-slate-400 mt-1">Paste code when creating the project or enable private repository access later.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {files.map((f) => (
                <div key={f.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate font-mono">{f.path}</p>
                    {f.summary && <p className="text-xs text-slate-500 truncate mt-0.5">{f.summary}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {f.language && (
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${langColors[f.language] || "bg-slate-100 text-slate-600"}`}>
                        {f.language}
                      </span>
                    )}
                    {f.size != null && (
                      <span className="text-xs text-slate-400">{f.size > 1024 ? `${(f.size / 1024).toFixed(1)}KB` : `${f.size}B`}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat */}
        <div>
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">AI Chat</h2>
          <ChatBox projectId={id} messages={messages} onNewMessage={handleNewMessage} />
        </div>
      </div>
    </div>
  );
}
