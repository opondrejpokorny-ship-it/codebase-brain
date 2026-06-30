import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { impactRiskStyles } from "@/lib/impactAnalysisDisplayUtils";

export default function AnalysisResultPanel({ result, riskLevel }) {
  if (!result) return null;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="font-heading font-semibold text-sm text-slate-900">Analysis result</h2>
        {riskLevel && <Badge variant="outline" className={impactRiskStyles[riskLevel] || impactRiskStyles.medium}>{riskLevel} risk</Badge>}
      </div>
      <ReactMarkdown className="prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{result}</ReactMarkdown>
    </div>
  );
}
