import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ClipboardCopy, DownloadCloud, FileDiff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMissingContextImportPrompt, formatMissingContextQueue } from "@/lib/missingContextQueueUtils";

export default function ImportQueueActions({
  projectId,
  project,
  queue = [],
  resolving = false,
  canResolve = false,
  hasResolvedTargets = false,
  onResolve,
  onClearResolved,
  onClearQueue,
}) {
  const [copiedQueue, setCopiedQueue] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const importPrompt = formatMissingContextImportPrompt({
    projectName: project?.name || "this project",
    repositoryUrl: project?.repository_url || "",
    queue,
  });

  const copyQueue = async () => {
    await navigator.clipboard.writeText(formatMissingContextQueue(queue));
    setCopiedQueue(true);
    window.setTimeout(() => setCopiedQueue(false), 1600);
  };

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(importPrompt);
    setCopiedPrompt(true);
    window.setTimeout(() => setCopiedPrompt(false), 1600);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onResolve} disabled={!canResolve} className="cursor-pointer gap-1.5">
        {resolving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DownloadCloud className="w-3.5 h-3.5" />}
        {resolving ? "Resolving…" : "Resolve from GitHub"}
      </Button>
      {hasResolvedTargets && (
        <Link to={`/project/${projectId}/impact`}>
          <Button type="button" variant="outline" size="sm" className="cursor-pointer gap-1.5">
            <FileDiff className="w-3.5 h-3.5" />
            Run Impact again
          </Button>
        </Link>
      )}
      <Button type="button" variant="outline" size="sm" onClick={copyPrompt} className="cursor-pointer gap-1.5">
        {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
        {copiedPrompt ? "Prompt copied" : "Copy import prompt"}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={copyQueue} className="cursor-pointer gap-1.5">
        {copiedQueue ? <Check className="w-3.5 h-3.5" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
        {copiedQueue ? "Copied" : "Copy queue"}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onClearResolved} disabled={!hasResolvedTargets} className="cursor-pointer">Clear resolved</Button>
      <Button type="button" variant="outline" size="sm" onClick={onClearQueue} className="cursor-pointer">Clear queue</Button>
    </div>
  );
}
