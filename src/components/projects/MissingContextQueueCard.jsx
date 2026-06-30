import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ClipboardCopy, DownloadCloud, Loader2, PackageSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { resolveQueuedTarget } from "@/lib/focusedGithubResolve";
import { clearMissingContextQueue, formatMissingContextImportPrompt, formatMissingContextQueue } from "@/lib/missingContextQueueUtils";

function queueStatusBadgeClass(status) {
  return status === "indexed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200";
}

function resolveQueueAgainstFiles(queue = [], files = []) {
  const storedPathSet = new Set(files.map((file) => String(file.path || "").replace(/^\/+/, "")));
  return queue.map((item) => resolveQueuedTarget(item, storedPathSet));
}

export default function MissingContextQueueCard({ project, projectId, queue = [], files = [], resolving = false, resolveMessage = "", resolveError = "", onResolve, onClear }) {
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
      await navigator.clipboard.writeText(formatMissingContextImportPrompt({ projectName: project?.name || "this project", repositoryUrl: project?.repository_url || "", queue }));
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
          <h2 className="font-heading font-semibold text-sm text-amber-900 flex items-center gap-2"><PackageSearch className="w-4 h-4" />Missing Context Import Queue</h2>
          <p className="text-xs text-amber-700 mt-1">{queue.length} target{queue.length === 1 ? "" : "s"} queued from Impact Analysis.</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Badge variant="outline" className="bg-white/70 text-amber-800 border-amber-200">{indexedCount}/{queue.length} resolved</Badge>
            {missingCount > 0 && <Badge variant="outline" className="bg-white/70 text-amber-800 border-amber-200">{missingCount} still missing</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onResolve} disabled={!canResolve} className="cursor-pointer gap-1.5 bg-white/70">
            {resolving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DownloadCloud className="w-3.5 h-3.5" />}
            {resolving ? "Resolving…" : "Resolve from GitHub"}
          </Button>
          <Link to={`/project/${projectId}/import-queue`}><Button type="button" variant="outline" size="sm" className="cursor-pointer gap-1.5 bg-white/70"><PackageSearch className="w-3.5 h-3.5" />Open checklist</Button></Link>
          <Button type="button" variant="outline" size="sm" onClick={handleCopyPrompt} className="cursor-pointer gap-1.5 bg-white/70">{copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <ClipboardCopy className="w-3.5 h-3.5" />}{copiedPrompt ? "Prompt copied" : "Copy import prompt"}</Button>
          <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="cursor-pointer gap-1.5 bg-white/70">{copied ? <Check className="w-3.5 h-3.5" /> : <ClipboardCopy className="w-3.5 h-3.5" />}{copied ? "Copied" : "Copy queue"}</Button>
          <Button type="button" variant="outline" size="sm" onClick={handleClear} className="cursor-pointer bg-white/70">Clear queue</Button>
        </div>
      </div>
      {resolveMessage && <p className="text-xs text-emerald-700 bg-white/70 border border-emerald-100 rounded-md px-3 py-2 mb-3">{resolveMessage}</p>}
      {resolveError && <p className="text-xs text-red-700 bg-white/70 border border-red-100 rounded-md px-3 py-2 mb-3">{resolveError}</p>}
      <div className="grid sm:grid-cols-2 gap-1.5">
        {resolvedQueue.map((item) => <div key={item.target} className="bg-white/60 rounded-md px-2 py-1.5"><div className="flex items-start justify-between gap-2"><p className="text-xs font-mono text-amber-800 break-all">{item.target}</p><Badge variant="outline" className={`${queueStatusBadgeClass(item.status)} flex-shrink-0 text-[10px] px-1.5 py-0`}>{item.status === "indexed" ? "Indexed" : "Missing"}</Badge></div>{item.matchedPath && <p className="text-[10px] text-emerald-700 mt-1 break-all">{item.matchedPath}</p>}</div>)}
      </div>
    </div>
  );
}
