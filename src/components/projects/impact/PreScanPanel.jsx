import { Braces, GitBranch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { impactRiskStyles } from "@/lib/impactAnalysisDisplayUtils";

/**
 * @param {{
 *   heuristicRisk?: string;
 *   changedFiles?: string[];
 *   changedSymbols?: Array<{ name: string; type: string; path: string; line?: number; exported?: boolean }>;
 *   graphSummary?: { totalRelations?: number };
 *   relatedPaths?: string[];
 *   signals?: string[];
 * }} props
 */
export default function PreScanPanel({ heuristicRisk, changedFiles = [], changedSymbols = [], graphSummary = {}, relatedPaths = [], signals = [] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="font-heading font-semibold text-sm text-slate-900 mb-3">Pre-scan</h3>
      <div className="space-y-3 text-sm">
        <div>
          <p className="text-xs text-slate-400 mb-1">Heuristic risk</p>
          <Badge variant="outline" className={impactRiskStyles[heuristicRisk] || impactRiskStyles.medium}>{heuristicRisk}</Badge>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1">Changed files detected</p>
          {changedFiles.length ? <div className="space-y-1 max-h-32 overflow-y-auto">{changedFiles.slice(0, 12).map((file) => <p key={file} className="text-xs font-mono text-slate-700 truncate">{file}</p>)}{changedFiles.length > 12 && <p className="text-xs text-slate-400">+{changedFiles.length - 12} more</p>}</div> : <p className="text-xs text-slate-400">No file paths detected yet.</p>}
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1">Changed symbols</p>
          {changedSymbols.length ? (
            <div className="space-y-1 max-h-28 overflow-y-auto">
              {changedSymbols.slice(0, 8).map((symbol) => (
                <p key={`${symbol.path}:${symbol.name}:${symbol.line}`} className="text-xs text-slate-700 truncate flex items-center gap-1.5">
                  <Braces className="w-3 h-3 text-slate-400" />
                  <span className="font-medium">{symbol.name}</span>
                  <span className="text-slate-400">{symbol.type}</span>
                  <span className="font-mono text-slate-400">{symbol.path}:{symbol.line || "?"}</span>
                </p>
              ))}
            </div>
          ) : <p className="text-xs text-slate-400">No changed symbols detected yet.</p>}
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1">Code Graph Lite</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-slate-50 px-2 py-1.5"><p className="text-slate-400">Relations</p><p className="font-semibold text-slate-700">{graphSummary.totalRelations || 0}</p></div>
            <div className="rounded-md bg-slate-50 px-2 py-1.5"><p className="text-slate-400">Related files</p><p className="font-semibold text-slate-700">{relatedPaths.length}</p></div>
          </div>
          {relatedPaths.length > 0 && <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">{relatedPaths.slice(0, 8).map((file) => <p key={file} className="text-xs font-mono text-slate-700 truncate flex items-center gap-1.5"><GitBranch className="w-3 h-3 text-slate-400" />{file}</p>)}</div>}
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1">Risk signals</p>
          {signals.length ? <div className="flex flex-wrap gap-1.5">{signals.map((signal) => <span key={signal} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{signal}</span>)}</div> : <p className="text-xs text-slate-400">None detected yet.</p>}
        </div>
      </div>
    </div>
  );
}
