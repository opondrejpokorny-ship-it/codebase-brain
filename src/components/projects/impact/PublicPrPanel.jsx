import { AlertTriangle, CheckCircle2, DownloadCloud, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { compatibilityStyles } from "@/lib/impactAnalysisDisplayUtils";

export default function PublicPrPanel({ prUrl, setPrUrl, prMeta, compatibility, fetchingPr, onFetchPr }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
      <div>
        <h2 className="font-heading font-semibold text-sm text-slate-900">Public GitHub PR</h2>
        <p className="text-xs text-slate-400 mt-1">Optional: load a public PR diff automatically before analysis.</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input value={prUrl} onChange={(event) => setPrUrl(event.target.value)} placeholder="https://github.com/owner/repo/pull/123" disabled={fetchingPr} />
        <Button type="button" variant="outline" onClick={onFetchPr} disabled={fetchingPr || !prUrl.trim()} className="gap-2 cursor-pointer whitespace-nowrap">
          {fetchingPr ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
          {fetchingPr ? "Fetching…" : "Fetch PR diff"}
        </Button>
      </div>
      {prMeta && (
        <div className="space-y-2">
          <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-sm text-blue-800">
            <p className="font-medium truncate">{prMeta.repositoryFullName}#{prMeta.prNumber}: {prMeta.title}</p>
            <p className="text-xs mt-1">{prMeta.changedFilesCount || prMeta.changedFiles?.length || 0} files · +{prMeta.additions || 0} -{prMeta.deletions || 0} · source: {prMeta.source || "unknown"}{prMeta.truncated ? " · diff truncated" : ""}</p>
          </div>
          <div className={`rounded-lg border px-3 py-2 text-sm ${compatibilityStyles[compatibility.status] || compatibilityStyles.unknown}`}>
            <p className="font-medium flex items-center gap-1.5">{compatibility.status === "match" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}Repository compatibility: {compatibility.status}</p>
            <p className="text-xs mt-1">{compatibility.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
