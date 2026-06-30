import { Check, ClipboardCopy, PackageSearch, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import QueuedTargetsPanel from "@/components/projects/context-pack-inspector/QueuedTargetsPanel";
import { missingContextLabel } from "@/lib/contextPackInspectorUtils";

export default function MissingContextList({
  relations = [],
  onCopyPaths,
  copiedPaths,
  onAddToQueue,
  queued,
  queuedTargets,
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
            {copiedPaths ? "Copied" : "Copy targets"}
          </Button>
          {canQueue && (
            <Button type="button" variant="outline" size="sm" onClick={onAddToQueue} className="h-7 gap-1.5 cursor-pointer text-xs bg-white/70">
              {queued ? <Check className="w-3 h-3" /> : <PackageSearch className="w-3 h-3" />}
              {queued ? "Queued" : "Add to queue"}
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-amber-700 mb-2">{relations.length} missing import target(s) from changed files.</p>
      {queuedTargets.length > 0 && <p className="text-xs text-amber-800 mb-2">{queuedTargets.length} target(s) currently queued.</p>}
      <div className="space-y-1 max-h-36 overflow-y-auto">
        {relations.map((relation, index) => <p key={`${relation.from_file}-${relation.import_path}-${index}`} className="text-xs text-amber-700 break-all">• {missingContextLabel(relation)}</p>)}
      </div>
      <QueuedTargetsPanel queue={queuedTargets} onCopyQueue={onCopyQueue} copiedQueue={copiedQueue} onClearQueue={onClearQueue} />
    </div>
  );
}
