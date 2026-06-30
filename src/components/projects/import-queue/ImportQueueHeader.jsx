import { PackageSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ImportQueueHeader({ queueLength = 0, indexedCount = 0, missingCount = 0 }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl font-bold text-slate-900 flex items-center gap-2">
            <PackageSearch className="w-5 h-5 text-slate-500" />
            Import Queue / Re-index Checklist
          </h1>
          <p className="text-sm text-slate-500 mt-1">Persistent missing-context queue with local fallback.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{queueLength} queued</Badge>
          {queueLength > 0 && <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">{indexedCount}/{queueLength} resolved</Badge>}
          {missingCount > 0 && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{missingCount} missing</Badge>}
        </div>
      </div>
    </div>
  );
}
