import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, ClipboardCopy, DownloadCloud, FileDiff, Loader2, PackageSearch, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { persistCodeRelationsIfAvailable } from "@/lib/codeRelationPersistence";
import {
  queueItemForStorage,
  resolveQueuedFilesFromPublicGitHub,
  resolveQueuedTarget,
} from "@/lib/focusedGithubResolve";
import {
  clearMissingContextQueue,
  formatMissingContextImportPrompt,
  formatMissingContextQueue,
  readBestMissingContextQueue,
  writeMissingContextQueue,
} from "@/lib/missingContextQueueUtils";

function ChecklistItem({ children }) {
  return (
    <li className="flex gap-2 text-sm text-slate-700">
      <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
      <span>{children}</span>
    </li>
  );
}

function statusBadgeClass(status) {
  if (status === "indexed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

export default function MissingContextImportQueue() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [resolveMessage, setResolveMessage] = useState("");
  const [resolveError, setResolveError] = useState("");
  const [copiedQueue, setCopiedQueue] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [projects, storedFiles] = await Promise.all([
          base44.entities.CodebaseProject.filter({ id }).catch(() => []),
          base44.entities.CodeFile.filter({ project_id: id }).catch(() => []),
        ]);
        if (!cancelled) {
          setProject(projects?.[0] || null);
          setFiles(storedFiles || []);
          setQueue(readBestMissingContextQueue(id));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const storedPathSet = useMemo(() => new Set(files.map((file) => String(file.path || "").replace(/^\/+/, ""))), [files]);
  const resolvedQueue = useMemo(() => queue.map((item) => resolveQueuedTarget(item, storedPathSet)), [queue, storedPathSet]);
  const indexedCount = resolvedQueue.filter((item) => item.status === "indexed").length;
  const missingCount = Math.max(0, resolvedQueue.length - indexedCount);
  const hasResolvedTargets = indexedCount > 0;
  const canResolveFromPublicGitHub = Boolean(project?.repository_url) && missingCount > 0;

  const importPrompt = formatMissingContextImportPrompt({
    projectName: project?.name || "this project",
    repositoryUrl: project?.repository_url || "",
    queue,
  });

  const handleCopyQueue = async () => {
    try {
      await navigator.clipboard.writeText(formatMissingContextQueue(queue));
      setCopiedQueue(true);
      window.setTimeout(() => setCopiedQueue(false), 1600);
    } catch {
      setCopiedQueue(false);
    }
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(importPrompt);
      setCopiedPrompt(true);
      window.setTimeout(() => setCopiedPrompt(false), 1600);
    } catch {
      setCopiedPrompt(false);
    }
  };

  const handleResolveFromPublicGitHub = async () => {
    setResolving(true);
    setResolveMessage("Resolving queued targets from public GitHub…");
    setResolveError("");

    try {
      const result = await resolveQueuedFilesFromPublicGitHub({
        repositoryUrl: project?.repository_url || "",
        projectId: id,
        resolvedQueue,
        storedPathSet,
      });

      const createdFiles = [];
      for (const file of result.filesToCreate) {
        const created = await base44.entities.CodeFile.create(file);
        createdFiles.push(created || file);
      }

      const nextFiles = [...files, ...createdFiles];
      setFiles(nextFiles);

      try {
        if (createdFiles.length > 0) {
          await persistCodeRelationsIfAvailable({ projectId: id, files: nextFiles });
          await base44.entities.CodebaseProject.update(id, { status: "indexed" }).catch(() => null);
        }
      } catch {
        // Resolution should still be visible even if relation persistence fails.
      }

      const missSuffix = result.misses.length ? ` ${result.misses.length} target${result.misses.length === 1 ? "" : "s"} still not found.` : "";
      setResolveMessage(`Imported ${createdFiles.length} file${createdFiles.length === 1 ? "" : "s"} from ${result.branch}.${missSuffix}`);
    } catch (error) {
      setResolveError(error?.message || "Failed to resolve queued targets from public GitHub.");
      setResolveMessage("");
    } finally {
      setResolving(false);
    }
  };

  const handleClearResolved = () => {
    const remaining = resolvedQueue
      .filter((item) => item.status !== "indexed")
      .map(queueItemForStorage);
    const next = writeMissingContextQueue(id, remaining);
    setQueue(next);
    setCopiedQueue(false);
    setCopiedPrompt(false);
    setResolveError("");
    setResolveMessage(
      remaining.length
        ? `Cleared resolved targets. ${remaining.length} target${remaining.length === 1 ? "" : "s"} still queued.`
        : "All resolved targets cleared from the queue."
    );
  };

  const handleClear = () => {
    clearMissingContextQueue(id);
    setQueue([]);
    setCopiedQueue(false);
    setCopiedPrompt(false);
    setResolveMessage("");
    setResolveError("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to={`/project/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors duration-150 cursor-pointer">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Project
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="font-heading text-xl font-bold text-slate-900 flex items-center gap-2">
              <PackageSearch className="w-5 h-5 text-slate-500" />
              Import Queue / Re-index Checklist
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Review missing context targets discovered by Impact Analysis and prepare the next focused import step.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              {queue.length} queued target{queue.length === 1 ? "" : "s"}
            </Badge>
            {queue.length > 0 && (
              <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                {indexedCount}/{queue.length} resolved
              </Badge>
            )}
            {missingCount > 0 && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                {missingCount} still missing
              </Badge>
            )}
          </div>
        </div>
      </div>

      {!queue.length ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <TriangleAlert className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-700">No missing context targets queued.</p>
          <p className="text-xs text-slate-400 mt-1">Run Impact Analysis and use Add to queue when missing context candidates appear.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="font-heading font-semibold text-sm text-slate-900">Queued targets</h2>
                <p className="text-xs text-slate-400 mt-1">Extensionless target paths ready for focused import resolution.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResolveFromPublicGitHub}
                  disabled={!canResolveFromPublicGitHub || resolving}
                  className="cursor-pointer gap-1.5"
                >
                  {resolving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DownloadCloud className="w-3.5 h-3.5" />}
                  {resolving ? "Resolving…" : "Resolve from GitHub"}
                </Button>
                {hasResolvedTargets && (
                  <Link to={`/project/${id}/impact`}>
                    <Button type="button" variant="outline" size="sm" className="cursor-pointer gap-1.5">
                      <FileDiff className="w-3.5 h-3.5" />
                      Run Impact again
                    </Button>
                  </Link>
                )}
                <Button type="button" variant="outline" size="sm" onClick={handleCopyPrompt} className="cursor-pointer gap-1.5">
                  {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
                  {copiedPrompt ? "Prompt copied" : "Copy import prompt"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleCopyQueue} className="cursor-pointer gap-1.5">
                  {copiedQueue ? <Check className="w-3.5 h-3.5" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
                  {copiedQueue ? "Copied" : "Copy queue"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleClearResolved} disabled={!hasResolvedTargets} className="cursor-pointer">
                  Clear resolved
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleClear} className="cursor-pointer">
                  Clear queue
                </Button>
              </div>
            </div>

            {resolveMessage && <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2 mb-3">{resolveMessage}</p>}
            {resolveError && <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 mb-3">{resolveError}</p>}

            <div className="space-y-2">
              {resolvedQueue.map((item) => (
                <div key={item.target} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-mono text-slate-800 break-all">{item.target}</p>
                      {(item.source_file || item.import_path) && (
                        <p className="text-xs text-slate-400 mt-1 break-all">
                          {item.source_file ? `From ${item.source_file}` : ""}
                          {item.import_path ? ` · import ${item.import_path}` : ""}
                        </p>
                      )}
                      {item.matchedPath ? (
                        <p className="text-xs text-emerald-700 mt-1 break-all">Matched stored file: {item.matchedPath}</p>
                      ) : (
                        <p className="text-xs text-amber-700 mt-1 break-all">Not found in stored context yet.</p>
                      )}
                    </div>
                    <Badge variant="outline" className={`${statusBadgeClass(item.status)} flex-shrink-0`}>
                      {item.status === "indexed" ? "Indexed" : "Missing"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-heading font-semibold text-sm text-slate-900 mb-3">Manual re-index checklist</h2>
              <ul className="space-y-2">
                <ChecklistItem>Resolve each target to an exact repository file.</ChecklistItem>
                <ChecklistItem>Prefer .js, .jsx, .ts, and .tsx matches.</ChecklistItem>
                <ChecklistItem>Check matching folder index files.</ChecklistItem>
                <ChecklistItem>Add only these resolved files to stored context.</ChecklistItem>
                <ChecklistItem>Rebuild code graph relations after import.</ChecklistItem>
                <ChecklistItem>Run Impact Analysis again and confirm context coverage improves.</ChecklistItem>
              </ul>
            </div>

            <div className="bg-slate-900 rounded-xl p-5 text-slate-100">
              <h2 className="font-heading font-semibold text-sm mb-3">Import prompt preview</h2>
              <pre className="text-xs whitespace-pre-wrap break-words text-slate-200 max-h-[360px] overflow-y-auto">{importPrompt}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
