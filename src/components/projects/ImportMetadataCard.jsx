import { AlertTriangle, CheckCircle2, GitBranch, Info, PackageSearch } from "lucide-react";

function normalizeImportMetadata(project) {
  const metadata = project?.import_metadata || project?.importMetadata || null;
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) return metadata;

  // Older projects may only have a text description. Keep a soft fallback.
  if (project?.description && /Imported \d+\/\d+ public GitHub files/i.test(project.description)) {
    return {
      source: "legacy_description",
      note: project.description,
    };
  }

  return null;
}

function sourceLabel(source) {
  if (source === "base44_backend_function") return "Backend function";
  if (source === "client_fallback_after_backend_error") return "Client fallback";
  if (source === "client_fallback") return "Client fallback";
  if (source === "public_github_focused_resolve") return "Focused GitHub resolve";
  if (source === "legacy_description") return "Legacy import";
  return source || "Unknown";
}

function FocusedResolveAudit({ metadata }) {
  const latest = metadata?.lastFocusedResolve || null;
  if (!latest) return null;

  const history = Array.isArray(metadata.focusedResolveHistory) ? metadata.focusedResolveHistory : [];
  const importedPaths = Array.isArray(latest.importedPaths) ? latest.importedPaths : [];
  const missingTargets = Array.isArray(latest.missingTargets) ? latest.missingTargets : [];

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
            <PackageSearch className="w-3.5 h-3.5 text-slate-400" />
            Focused resolve audit
          </p>
          <p className="text-xs text-slate-400 mt-1">Last missing-context re-index step.</p>
        </div>
        <span className="text-xs bg-slate-50 text-slate-600 px-2 py-1 rounded-md">
          {history.length || 1} run{(history.length || 1) === 1 ? "" : "s"}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-400">Imported</p>
          <p className="font-semibold text-slate-800">{latest.importedFilesCount ?? 0}</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-400">Still missing</p>
          <p className="font-semibold text-slate-800">{latest.missingTargetsCount ?? 0}</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-400">Queued</p>
          <p className="font-semibold text-slate-800">{latest.queuedTargetsCount ?? "—"}</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-400">Branch</p>
          <p className="font-semibold text-slate-800 truncate">{latest.branch || "—"}</p>
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-500 space-y-1">
        {latest.resolvedAt && <p>Resolved at: <span className="font-mono text-slate-700">{latest.resolvedAt}</span></p>}
        {importedPaths.length > 0 && (
          <p>Imported paths: <span className="font-mono text-slate-700">{importedPaths.slice(0, 4).join(", ")}{importedPaths.length > 4 ? ` +${importedPaths.length - 4} more` : ""}</span></p>
        )}
        {missingTargets.length > 0 && (
          <p className="text-amber-700">Still missing: <span className="font-mono">{missingTargets.slice(0, 4).join(", ")}{missingTargets.length > 4 ? ` +${missingTargets.length - 4} more` : ""}</span></p>
        )}
      </div>
    </div>
  );
}

export default function ImportMetadataCard({ project }) {
  const metadata = normalizeImportMetadata(project);
  if (!metadata) return null;

  const imported = Number(metadata.importedFilesCount ?? metadata.imported_count ?? 0);
  const attempted = Number(metadata.attemptedFiles ?? metadata.attempted_count ?? 0);
  const skipped = Number(metadata.skippedFiles ?? metadata.skipped_count ?? 0);
  const errors = Array.isArray(metadata.errors) ? metadata.errors : [];
  const hasFocusedResolveWarnings = Number(metadata.lastFocusedResolve?.missingTargetsCount || 0) > 0;
  const hasWarnings = errors.length > 0 || metadata.truncatedTree || hasFocusedResolveWarnings;

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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-400">Imported</p>
          <p className="font-semibold text-slate-800">{Number.isFinite(imported) ? imported : "—"}</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-400">Attempted</p>
          <p className="font-semibold text-slate-800">{Number.isFinite(attempted) ? attempted : "—"}</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-400">Skipped</p>
          <p className="font-semibold text-slate-800">{Number.isFinite(skipped) ? skipped : "—"}</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-400">Source</p>
          <p className="font-semibold text-slate-800 truncate">{sourceLabel(metadata.source)}</p>
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-500 space-y-1">
        {metadata.repositoryFullName && <p>Repository: <span className="font-mono text-slate-700">{metadata.repositoryFullName}</span></p>}
        {metadata.defaultBranch && <p>Default branch: <span className="font-mono text-slate-700">{metadata.defaultBranch}</span></p>}
        {metadata.note && <p>{metadata.note}</p>}
        {metadata.backendError && (
          <p className="text-amber-700 flex items-start gap-1.5">
            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
            Backend import was unavailable, so the client fallback was used: {metadata.backendError}
          </p>
        )}
        {metadata.truncatedTree && (
          <p className="text-amber-700 flex items-start gap-1.5">
            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            GitHub marked the repository tree as truncated, so this import is incomplete.
          </p>
        )}
      </div>

      <FocusedResolveAudit metadata={metadata} />

      {errors.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="text-xs font-medium text-slate-500 mb-2">File import warnings</p>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {errors.slice(0, 8).map((error, index) => (
              <p key={`${error.path || "error"}-${index}`} className="text-xs text-amber-700 font-mono truncate">
                {error.path || "unknown"}: {error.message || "failed"}
              </p>
            ))}
            {errors.length > 8 && <p className="text-xs text-slate-400">+{errors.length - 8} more warnings</p>}
          </div>
        </div>
      )}
    </div>
  );
}
