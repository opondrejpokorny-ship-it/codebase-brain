import { Link } from "react-router-dom";
import { BookOpenCheck, FileDiff, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ImpactHeader({ projectId, filesCount = 0 }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl font-bold text-slate-900 flex items-center gap-2"><FileDiff className="w-5 h-5 text-slate-500" />Manual PR / Diff Impact Analysis</h1>
          <p className="text-sm text-slate-500 mt-1">Paste a public GitHub PR URL, diff, or changed file list. Codebase Brain compares it with stored context and graph relations.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 justify-center">{filesCount} stored files</Badge>
          <Link to={`/project/${projectId}/rules`}><Button variant="outline" size="sm" className="cursor-pointer gap-2 w-full sm:w-auto"><BookOpenCheck className="w-4 h-4" />Project Rules</Button></Link>
          <Link to={`/project/${projectId}/risk-memory`}><Button variant="outline" size="sm" className="cursor-pointer gap-2 w-full sm:w-auto"><History className="w-4 h-4" />Risk Memory</Button></Link>
        </div>
      </div>
    </div>
  );
}
