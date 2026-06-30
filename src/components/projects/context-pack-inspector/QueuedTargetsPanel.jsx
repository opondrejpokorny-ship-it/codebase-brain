import { Check, ClipboardCopy } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function QueuedTargetsPanel({ queue = [], onCopyQueue, copiedQueue, onClearQueue }) {
  if (!queue.length) return null;
  return (
    <div className="mt-3 rounded-lg bg-white/70 border border-amber-100 p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-xs font-medium text-amber-900">Queued import targets</p>
          <p className="text-xs text-amber-700 mt-0.5">Persisted when possible; local fallback remains.</p>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <Button type="button" variant="outline" size="sm" onClick={onCopyQueue} className="h-7 gap-1.5 cursor-pointer text-xs bg-white/80">
            {copiedQueue ? <Check className="w-3 h-3" /> : <ClipboardCopy className="w-3 h-3" />}
            {copiedQueue ? "Copied" : "Copy queue"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onClearQueue} className="h-7 cursor-pointer text-xs bg-white/80">Clear queue</Button>
        </div>
      </div>
      <div className="space-y-1 max-h-28 overflow-y-auto">
        {queue.map((item) => <p key={item.target} className="text-xs font-mono text-amber-800 break-all">{item.target}</p>)}
      </div>
    </div>
  );
}
