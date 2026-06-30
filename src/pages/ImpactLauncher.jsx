import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileDiff, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";

export default function ImpactLauncher() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.CodebaseProject.list("-created_date", 100)
      .then((rows) => setProjects(rows || []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors duration-150 cursor-pointer">
        <ArrowLeft className="w-3.5 h-3.5" />
        Dashboard
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h1 className="font-heading text-xl font-bold text-slate-900 flex items-center gap-2">
          <FileDiff className="w-5 h-5 text-slate-500" />
          Impact Analysis
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
          Pick a project first. The dynamic route <code className="bg-slate-100 px-1 rounded">/project/:id/impact</code> needs a real project ID, so this page sends you to the correct URL.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <ShieldAlert className="w-9 h-9 text-slate-300 mx-auto mb-3" />
          <h2 className="font-heading font-semibold text-slate-900">No projects yet</h2>
          <p className="text-sm text-slate-500 mt-1 mb-5">Create a project before running impact analysis.</p>
          <Link to="/add">
            <Button className="cursor-pointer">Add Repository</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {projects.map((project) => (
            <div key={project.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-heading font-semibold text-slate-900 truncate">{project.name}</h2>
                  <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                    {project.status || "unknown"}
                  </Badge>
                </div>
                {project.repository_url && (
                  <p className="text-xs text-slate-400 truncate">{project.repository_url}</p>
                )}
              </div>
              <Link to={`/project/${project.id}/impact`}>
                <Button variant="outline" size="sm" className="gap-2 cursor-pointer w-full sm:w-auto">
                  <FileDiff className="w-4 h-4" />
                  Open Impact Analysis
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
