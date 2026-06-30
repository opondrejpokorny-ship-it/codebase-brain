import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Building2, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { base44 } from "@/api/base44Client";
import { buildCodeRelations } from "@/lib/codeGraphUtils";
import { buildArchitectureFacts, formatArchitectureFactsMarkdown } from "@/lib/architectureUtils";

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

  const markdown = useMemo(() => {
    const relations = buildCodeRelations(files);
    const facts = buildArchitectureFacts({ project, files, relations });
    return formatArchitectureFactsMarkdown(facts);
  }, [project, files]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <Link to={`/project/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors duration-150 cursor-pointer">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Project
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h1 className="font-heading text-xl font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-slate-500" />
          Architecture Overview
        </h1>
        <p className="text-sm text-slate-500 mt-1">Deterministic architecture overview from stored files, graph relations, symbols, and stack hints. No full-repo AI context required.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <ReactMarkdown className="prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
          {markdown}
        </ReactMarkdown>
      </div>
    </div>
  );
}
