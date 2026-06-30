import { FileCode, Layers } from "lucide-react";

const languageBadgeStyles = {
  JavaScript: "bg-yellow-100 text-yellow-800",
  TypeScript: "bg-blue-100 text-blue-800",
  Python: "bg-green-100 text-green-800",
  CSS: "bg-purple-100 text-purple-800",
  HTML: "bg-orange-100 text-orange-800",
  JSON: "bg-slate-100 text-slate-600",
};

function formatSize(size) {
  if (size == null) return null;
  return size > 1024 ? `${(size / 1024).toFixed(1)}KB` : `${size}B`;
}

export default function FilesPanel({ files = [] }) {
  return (
    <div>
      <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <FileCode className="w-3.5 h-3.5" />
        Files ({files.length})
      </h2>
      {files.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No files indexed yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {files.map((file) => (
            <div key={file.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 truncate font-mono">{file.path}</p>
                {file.summary && <p className="text-xs text-slate-500 truncate mt-0.5">{file.summary}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {file.language && <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${languageBadgeStyles[file.language] || "bg-slate-100 text-slate-600"}`}>{file.language}</span>}
                {formatSize(file.size) && <span className="text-xs text-slate-400">{formatSize(file.size)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
