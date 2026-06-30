import { AlertTriangle, CheckCircle2, GitBranch, Info } from "lucide-react";
import FocusedResolveAudit from "@/components/projects/import-metadata/FocusedResolveAudit";
import ImportSummaryGrid from "@/components/projects/import-metadata/ImportSummaryGrid";
import ImportWarningsList from "@/components/projects/import-metadata/ImportWarningsList";
import MissingContextQueueAudit from "@/components/projects/import-metadata/MissingContextQueueAudit";
import { metadataWarnings, normalizeImportMetadata } from "@/lib/importMetadataDisplayUtils";

export default function ImportMetadataCard({ project }) {
  const metadata = normalizeImportMetadata(project);
  if (!metadata) return null;

  const errors = Array.isArray(metadata.errors) ? metadata.errors : [];
  const hasWarnings = metadataWarnings(metadata, errors);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-heading font-semibold text-sm text-slate-900 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-slate-500" />
            Import Details
          </h3>
          <p className="text-xs text-slate-400 mt-1">Small audit trail for this repository import.</p>
        </div>
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md ${hasWarnings ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
          {hasWarnings ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
          {hasWarnings ? "Warnings" : "OK"}
        </span>
      </div>

      <ImportSummaryGrid metadata={metadata} />

      <div className="mt-3 text-xs text-slate-500 space-y-1">
        {metadata.repositoryFullName && <p>Repository: <span className="font-mono text-slate-700">{metadata.repositoryFullName}</span></p>}
        {metadata.defaultBranch && <p>Default branch: <span className="font-mono text-slate-700">{metadata.defaultBranch}</span></p>}
        {metadata.note && <p>{metadata.note}</p>}
        {metadata.backendError && <p className="text-amber-700 flex items-start gap-1.5"><Info className="w-3 h-3 mt-0.5 flex-shrink-0" />Backend import was unavailable, so the client fallback was used: {metadata.backendError}</p>}
        {metadata.truncatedTree && <p className="text-amber-700 flex items-start gap-1.5"><AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />GitHub marked the repository tree as truncated, so this import is incomplete.</p>}
      </div>

      <FocusedResolveAudit metadata={metadata} />
      <MissingContextQueueAudit metadata={metadata} />
      <ImportWarningsList errors={errors} />
    </div>
  );
}
