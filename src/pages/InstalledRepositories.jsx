import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ExternalLink, GitBranch, Link2, Loader2, Lock, RefreshCw, ShieldAlert, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

function safeEntity(name) {
  return base44?.entities?.[name] || null;
}

function statusBadge(status) {
  const active = status === "active";
  return (
    <Badge variant="outline" className={active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200"}>
      {active ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <ShieldAlert className="w-3 h-3 mr-1" />}
      {status || "unknown"}
    </Badge>
  );
}

function privacyBadge(isPrivate) {
  return (
    <Badge variant="outline" className={isPrivate ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-blue-50 text-blue-700 border-blue-200"}>
      {isPrivate ? <Lock className="w-3 h-3 mr-1" /> : <GitBranch className="w-3 h-3 mr-1" />}
      {isPrivate ? "private" : "public"}
    </Badge>
  );
}

function projectName(projects, projectId) {
  return projects.find((project) => project.id === projectId)?.name || null;
}

export default function InstalledRepositories() {
  const { toast } = useToast();
  const [repositories, setRepositories] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState(null);

  const activeCount = useMemo(() => repositories.filter((repo) => repo.status === "active").length, [repositories]);
  const privateCount = useMemo(() => repositories.filter((repo) => repo.private).length, [repositories]);
  const linkedCount = useMemo(() => repositories.filter((repo) => repo.project_id).length, [repositories]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const repoEntity = safeEntity("GitHubRepositoryLink");
      const projectEntity = safeEntity("CodebaseProject");

      if (!repoEntity?.list || !projectEntity?.list) {
        setRepositories([]);
        setProjects([]);
        setError("GitHubRepositoryLink or CodebaseProject entity API is not available in this runtime. Run /diagnostics first.");
        return;
      }

      const [repoRows, projectRows] = await Promise.all([
        repoEntity.list("-updated_date", 200),
        projectEntity.list("-created_date", 200),
      ]);
      setRepositories(repoRows || []);
      setProjects(projectRows || []);
    } catch (err) {
      setError(err?.message || "Could not load installed repository links.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateRepositoryProject = async (repo, projectId) => {
    const repoEntity = safeEntity("GitHubRepositoryLink");
    if (!repoEntity?.update) {
      toast({ title: "Repository link entity is not available", variant: "destructive" });
      return;
    }

    setSavingId(repo.id);
    try {
      await repoEntity.update(repo.id, {
        project_id: projectId || null,
        linked_status: projectId ? "linked" : "unlinked",
        linked_at: projectId ? new Date().toISOString() : null,
        updated_date: new Date().toISOString(),
      });
      setRepositories((prev) => prev.map((item) => (
        item.id === repo.id
          ? { ...item, project_id: projectId || null, linked_status: projectId ? "linked" : "unlinked" }
          : item
      )));
      toast({ title: projectId ? "Repository linked" : "Repository unlinked" });
    } catch (err) {
      toast({
        title: "Failed to update repository link",
        description: err?.message || "Could not update GitHubRepositoryLink.",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors duration-150 cursor-pointer">
        <ArrowLeft className="w-3.5 h-3.5" />
        Dashboard
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-xl font-bold text-slate-900 flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-slate-500" />
              Installed GitHub Repositories
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              View repository metadata captured from GitHub App installation webhooks and optionally link repositories to Codebase Projects. This does not import private files yet.
            </p>
          </div>
          <Button variant="outline" onClick={loadData} disabled={loading} className="gap-2 cursor-pointer">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400">Active repositories</p>
          <p className="text-2xl font-bold text-slate-900">{activeCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400">Private repositories</p>
          <p className="text-2xl font-bold text-slate-900">{privateCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400">Linked to projects</p>
          <p className="text-2xl font-bold text-slate-900">{linkedCount}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex gap-2">
          <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Repository link metadata is not ready yet.</p>
            <p className="mt-1">{error}</p>
            <Link to="/diagnostics" className="inline-flex mt-2 underline font-medium">Open diagnostics</Link>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : repositories.length === 0 && !error ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <GitBranch className="w-9 h-9 text-slate-300 mx-auto mb-3" />
          <h2 className="font-heading font-semibold text-slate-900">No installed repositories recorded yet</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-lg mx-auto">
            Install the GitHub App and enable repository link logging after diagnostics confirms the entity API. This page will then show captured repository metadata.
          </p>
        </div>
      ) : repositories.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {repositories.map((repo) => {
            const linkedProject = projectName(projects, repo.project_id);
            return (
              <div key={repo.id || `${repo.installation_id}-${repo.repository_id}`} className="p-4 space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h2 className="font-mono text-sm font-semibold text-slate-900 truncate">
                        {repo.repository_full_name || repo.repository_name || "unknown repository"}
                      </h2>
                      {statusBadge(repo.status)}
                      {privacyBadge(Boolean(repo.private))}
                      {repo.project_id && (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          <Link2 className="w-3 h-3 mr-1" />
                          linked
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      installation: {repo.installation_id || "unknown"} · repository_id: {repo.repository_id || "unknown"}
                    </p>
                    {repo.repository_url && (
                      <a href={repo.repository_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1">
                        Open on GitHub <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div className="lg:w-80 space-y-2">
                    <label className="text-xs font-medium text-slate-500">Linked Codebase Project</label>
                    <select
                      value={repo.project_id || ""}
                      disabled={savingId === repo.id}
                      onChange={(event) => updateRepositoryProject(repo, event.target.value)}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                    >
                      <option value="">Not linked</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                    {repo.project_id && (
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-slate-500 truncate">{linkedProject || "Linked project not found"}</p>
                        <button
                          type="button"
                          onClick={() => updateRepositoryProject(repo, "")}
                          disabled={savingId === repo.id}
                          className="text-xs text-red-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Unlink className="w-3 h-3" />
                          unlink
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        This page only links metadata records to projects. Private repository file import still requires a later installation-token phase.
      </div>
    </div>
  );
}
