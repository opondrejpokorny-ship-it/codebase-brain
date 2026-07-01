import { Braces } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { extractSymbolsFromFiles, summarizeSymbols } from "@/lib/codeSymbolUtils";

const typeStyles = {
  component: "bg-purple-50 text-purple-700 border-purple-200",
  hook: "bg-blue-50 text-blue-700 border-blue-200",
  function: "bg-emerald-50 text-emerald-700 border-emerald-200",
  class: "bg-amber-50 text-amber-700 border-amber-200",
  const: "bg-slate-50 text-slate-700 border-slate-200",
};

export default function CodeSymbolsCard({ files = [] }) {
  const symbols = extractSymbolsFromFiles(files);
  const summary = summarizeSymbols(symbols);
  const topSymbols = symbols.slice(0, 16);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-heading font-semibold text-sm text-slate-900 flex items-center gap-2">
            <Braces className="w-4 h-4 text-slate-500" />
            Symbol Extraction Lite
          </h2>
          <p className="text-xs text-slate-400 mt-1">Lightweight functions, components, hooks, and classes detected from stored files.</p>
        </div>
        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">{summary.total} symbols</Badge>
      </div>

      {summary.total > 0 ? (
        <>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {Object.entries(summary.byType).map(([type, count]) => (
              <Badge key={type} variant="outline" className={typeStyles[type] || typeStyles.const}>{type}: {count}</Badge>
            ))}
          </div>
          <div className="space-y-2">
            {topSymbols.map((symbol) => (
              <div key={`${symbol.path}:${symbol.name}:${symbol.line}`} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{symbol.name}</p>
                  <p className="text-xs font-mono text-slate-500 truncate">{symbol.path}:{symbol.line}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {symbol.exported && <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">export</span>}
                  <Badge variant="outline" className={typeStyles[symbol.type] || typeStyles.const}>{symbol.type}</Badge>
                </div>
              </div>
            ))}
            {symbols.length > topSymbols.length && <p className="text-xs text-slate-400 text-center pt-1">+{symbols.length - topSymbols.length} more symbols</p>}
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-400">No functions, components, hooks, or classes detected in the stored sample yet.</p>
      )}
    </div>
  );
}
