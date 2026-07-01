import { Check, ClipboardCopy, PackageSearch, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import QueuedTargetsPanel from "@/components/projects/context-pack-inspector/QueuedTargetsPanel";
import { missingContextLabel } from "@/lib/contextPackInspectorUtils";

function queueItem(target = "") {
  return { target };
}

export default function MissingContextList({
  relations = [],
  currentMissingTargets = [],
  queuedCurrentTargets = [],
  queuedOtherTargets = [],
  onCopyPaths,
  copiedPaths,
  onCopyImportInstructions,
  copiedImportInstructions,
  onAddToQueue,
  queued,
  queuedTargets = [],
  onCopyQueue,
  copiedQueue,
  onClearQueue,
  canQueue,
}) {
  if (!relations.length) return null;
  return (
    <div className="mt-4 rounded-lg bg-amber-50 border border-amber-100 p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs font-medium text-amber-800 flex items-center gap-1.5">
          <TriangleAlert className="w-3.5 h-3.5" />
          Missing context candidates
        </p>
        <div className="flex flex-wrap justify-end gap-1.5">
          <Button type="button" variant="outline" size="sm" onClick={onCopyPaths} className="h-7 gap-1.5 cursor-pointer text-xs bg-white/70">
            {copiedPaths ? <Check className="w-3 h-3" /> : <ClipboardCopy className="w-3 h-3" />}
            {copiedPaths ? "Copied" : "Copy current targets"}
          </Button>
          {onCopyImportInstructions && (
            <Button type="button" variant="outline" size="sm" onClick={onCopyImportInstructions} className="h-7 gap-1.5 cursor-pointer text-xs bg-white/70">
              {copiedImportInstructions ? <Check className="w-3 h-3" /> : <ClipboardCopy className="w-3 h-3" />}
              {copiedImportInstructions ? "Copied" : "Copy import instructions"}
            </Button>
          )}
          {canQueue && (
            <Button type="button" variant="outline" size="sm" onClick={onAddToQueue} className="h-7 gap-1.5 cursor-pointer text-xs bg-white/70">
              {queued ? <Check className="w-3 h-3" /> : <PackageSearch className="w-3 h-3" />}
              {queued ? "Current queued" : "Queue current"}
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-amber-700 mb-2">{relations.length} missing import target(s) from changed files.</p>

      <QueuedTargetsPanel
        queue={currentMissingTargets.map(queueItem)}
        title="Current missing targets"
        description="Targets inferred from this diff only. Copy or queue these first."
        showClear={false}
      />

      <div className="space-y-1 max-h-36 overflow-y-auto mt-3">
        {relations.map((relation, index) => <p key={`${relation.from_file}-${relation.import_path}-${index}`} className="text-xs text-amber-700 break-all">• {missingContextLabel(relation)}</p>)}
      </div>

      <QueuedTargetsPanel
        queue={queuedCurrentTargets}
        title="Queued current targets"
        description="Current diff targets already present in the queue."
        showClear={false}
      />

      <QueuedTargetsPanel
        queue={queuedOtherTargets}
        title="Other queued targets"
        description={queuedTargets.length ? `${queuedTargets.length} total target(s) queued across this project.` : "No other queued targets."}
        onCopyQueue={onCopyQueue}
        copiedQueue={copiedQueue}
        onClearQueue={onClearQueue}
      />
    </div>
  );
}
