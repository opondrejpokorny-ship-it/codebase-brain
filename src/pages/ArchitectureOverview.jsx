import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Building2, Download, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { buildCodeRelations } from "@/lib/codeGraphUtils";
import { buildArchitectureFacts, formatArchitectureFactsMarkdown } from "@/lib/architectureUtils";
import { downloadJsonReport, downloadMarkdownReport } from "@/lib/reportDownloadUtils";

export default function ArchitectureOverview() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.CodebaseProject.filter({ id }),
      base44.entities.CodeFile.filter({ project_id: id }),
    ])
      .then(([projects, storedFiles]) => {
        setProject(projects?.[0] || null);
        setFiles(storedFiles || []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const { markdown, facts } = useMemo(() => {
    const relations = buildCodeRelations(files);
    const architectureFacts = buildArchitectureFacts({ project, files, relations });
    return {
      facts: architectureFacts,
      markdown: formatArchitectureFactsMarkdown(architectureFacts),
    };
  }, [project, files]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;
  }

  const projectName = project?.name || "project";

  return (
    <div className="space-y-6">
      <Link to={`/project/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors duration-150 cursor-pointer">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Project
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="font-heading text-xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-500" />
              Architecture Overview
            </h1>
            <p className="text-sm text-slate-500 mt-1">Deterministic architecture overview from stored files, graph relations, symbols, and stack hints. No full-repo AI context required.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-2 cursor-pointer" onClick={() => downloadMarkdownReport(projectName, "architecture-report", markdown)}>
              <Download className="w-4 h-4" />
              Export MD
            </Button>
            <Button variant="outline" size="sm" className="gap-2 cursor-pointer" onClick={() => downloadJsonReport(projectName, "architecture-facts", facts)}>
              <Download className="w-4 h-4" />
              Export JSON
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <ReactMarkdown className="prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
          {markdown}
        </ReactMarkdown>
      </div>
    </div>
  );
}
