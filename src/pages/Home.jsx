import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Brain, Loader2, ServerCog, GitBranch, FileDiff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import ProjectCard from "@/components/projects/ProjectCard";
import ComingNextCard from "@/components/projects/ComingNextCard";
import WorkspaceQualityOverview from "@/components/projects/WorkspaceQualityOverview";

export default function Home() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.CodebaseProject.list("-created_date", 50)
      .then(setProjects)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Codebase Brain</h1>
          <p className="text-slate-500 mt-1 max-w-lg">
            Index your codebase, get AI-powered answers about architecture, dependencies, and logic.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link to="/impact">
            <Button variant="outline" className="cursor-pointer gap-2 w-full sm:w-auto">
              <FileDiff className="w-4 h-4" />
              Impact Analysis
            </Button>
          </Link>
          <Link to="/github/repositories">
            <Button variant="outline" className="cursor-pointer gap-2 w-full sm:w-auto">
              <GitBranch className="w-4 h-4" />
              GitHub Repos
            </Button>
          </Link>
          <Link to="/diagnostics">
            <Button variant="outline" className="cursor-pointer gap-2 w-full sm:w-auto">
              <ServerCog className="w-4 h-4" />
              Diagnostics
            </Button>
          </Link>
          <Link to="/add">
            <Button className="cursor-pointer gap-2 w-full sm:w-auto">
              <Plus className="w-4 h-4" />
              Add Repository
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Projects list */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Projects</h2>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Brain className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="font-heading font-semibold text-slate-900 mb-1">No projects yet</h3>
              <p className="text-sm text-slate-500 mb-5">Add a GitHub repository or paste code to get started.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                <Link to="/github/repositories">
                  <Button variant="outline" className="cursor-pointer gap-2 w-full sm:w-auto">
                    <GitBranch className="w-4 h-4" />
                    GitHub Repos
                  </Button>
                </Link>
                <Link to="/diagnostics">
                  <Button variant="outline" className="cursor-pointer gap-2 w-full sm:w-auto">
                    <ServerCog className="w-4 h-4" />
                    Run Diagnostics
                  </Button>
                </Link>
                <Link to="/add">
                  <Button variant="outline" className="cursor-pointer gap-2 w-full sm:w-auto">
                    <Plus className="w-4 h-4" />
                    Add Your First Project
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {!loading && <WorkspaceQualityOverview projects={projects} />}
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Roadmap</h2>
          <ComingNextCard />
        </div>
      </div>
    </div>
  );
}
