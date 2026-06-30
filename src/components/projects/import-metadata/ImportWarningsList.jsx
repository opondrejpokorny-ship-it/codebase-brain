export default function ImportWarningsList({ errors = [] }) {
  if (!errors.length) return null;

  return (
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
  );
}
