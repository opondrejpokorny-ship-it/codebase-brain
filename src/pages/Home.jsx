import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus, Brain, Loader2, ServerCog, GitBranch, FileDiff, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import ProjectCard from "@/components/projects/ProjectCard";
import ComingNextCard from "@/components/projects/ComingNextCard";
import WorkspaceQualityOverview from "@/components/projects/WorkspaceQualityOverview";
import WorkspaceOnboardingChecklist from "@/components/projects/WorkspaceOnboardingChecklist";
import { buildProductQualityReport } from "@/lib/productQualityUtils";
import { readHomePreference, writeHomePreference } from "@/lib/homePreferenceUtils";

function decoratedProject(project) {
  return { project, report: buildProductQualityReport({ project }) };
}

function filterProjects(items, filter) {
  if (filter === "needs_action") return items.filter((item) => item.report.overall < 70 || item.report.priorities.some((priority) => priority.severity === "high"));
  if (filter === "product_ready") return items.filter((item) => item.report.tier.label === "Product-ready");
  if (filter === "strong_beta") return items.filter((item) => item.report.tier.label === "Strong beta");
  if (filter === "mvp_plus") return items.filter((item) => item.report.tier.label === "MVP+");
  if (filter === "hardening") return items.filter((item) => item.report.tier.label === "Needs hardening");
  return items;
}

function sortProjects(items, sortMode) {
  const copy = [...items];
  if (sortMode === "quality_desc") return copy.sort((a, b) => b.report.overall - a.report.overall);
  if (sortMode === "quality_asc") return copy.sort((a, b) => a.report.overall - b.report.overall);
  if (sortMode === "name") return copy.sort((a, b) => String(a.project.name || "").localeCompare(String(b.project.name || "")));
  return copy.sort((a, b) => new Date(b.project.created_date || 0).getTime() - new Date(a.project.created_date || 0).getTime());
}

export default function Home() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qualityFilter, setQualityFilter] = useState(() => readHomePreference("qualityFilter", "all"));
  const [sortMode, setSortMode] = useState(() => readHomePreference("sortMode", "created_desc"));

  useEffect(() => {
    base44.entities.CodebaseProject.list("-created_date", 50)
      .then(setProjects)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    writeHomePreference("qualityFilter", qualityFilter);
  }, [qualityFilter]);

  useEffect(() => {
    writeHomePreference("sortMode", sortMode);
  }, [sortMode]);

  const visibleProjects = useMemo(() => {
    const decorated = projects.map(decoratedProject);
    return sortProjects(filterProjects(decorated, qualityFilter), sortMode).map((item) => item.project);
  }, [projects, qualityFilter, sortMode]);

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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Projects</h2>
              {!loading && projects.length > 0 && <p className="text-xs text-slate-400 mt-1">Showing {visibleProjects.length} of {projects.length}</p>}
            </div>
            {!loading && projects.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-2">
                <label className="sr-only" htmlFor="quality-filter">Quality filter</label>
                <select
                  id="quality-filter"
                  value={qualityFilter}
                  onChange={(event) => setQualityFilter(event.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <option value="all">All quality tiers</option>
                  <option value="needs_action">Needs action</option>
                  <option value="product_ready">Product-ready</option>
                  <option value="strong_beta">Strong beta</option>
                  <option value="mvp_plus">MVP+</option>
                  <option value="hardening">Needs hardening</option>
                </select>
                <label className="sr-only" htmlFor="quality-sort">Sort projects</label>
                <select
                  id="quality-sort"
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <option value="created_desc">Newest first</option>
                  <option value="quality_asc">Lowest quality first</option>
                  <option value="quality_desc">Highest quality first</option>
                  <option value="name">Name A-Z</option>
                </select>
              </div>
            )}
          </div>

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
          ) : visibleProjects.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
              <SlidersHorizontal className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <h3 className="font-heading font-semibold text-slate-900 mb-1">No projects match this filter</h3>
              <p className="text-sm text-slate-500 mb-4">Try another quality tier or reset to all projects.</p>
              <Button variant="outline" onClick={() => setQualityFilter("all")} className="cursor-pointer">Reset filter</Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {visibleProjects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {!loading && <WorkspaceOnboardingChecklist projects={projects} />}
          {!loading && <WorkspaceQualityOverview projects={projects} />}
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Roadmap</h2>
          <ComingNextCard />
        </div>
      </div>
    </div>
  );
}
