import { CheckCircle2, GitBranch, Lock, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function normalizeRepoUrl(value = "") {
  return String(value || "")
    .trim()
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/\/$/, "")
    .toLowerCase();
}

function findBestLink(project, links = []) {
  const projectRepo = normalizeRepoUrl(project?.repository_url || "");
  return links.find((link) => link.status === "active" && link.project_id === project?.id)
    || links.find((link) => link.status === "active" && normalizeRepoUrl(link.repository_full_name) === projectRepo)
    || null;
}

export default function PrivateImportReadinessCard({ project, repositoryLinks = [] }) {
  if (!project?.repository_url) return null;

  const isUrlOnly = project.status === "url_only";
  const activeLink = findBestLink(project, repositoryLinks);

  if (!isUrlOnly && !activeLink) return null;

  const readyForFutureImport = Boolean(isUrlOnly && activeLink);

  return (
    <div className={`rounded-xl border p-5 ${readyForFutureImport ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          {readyForFutureImport ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-700 mt-0.5 flex-shrink-0" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0" />
          )}
          <div>
            <h3 className={`font-heading font-semibold text-sm ${readyForFutureImport ? "text-emerald-900" : "text-amber-900"}`}>
              Private import readiness
            </h3>
            <p className={`text-sm mt-1 ${readyForFutureImport ? "text-emerald-800" : "text-amber-800"}`}>
              {readyForFutureImport
                ? "This URL-only project is linked to an active GitHub App repository metadata record. Private file import can be added after installation-token support is implemented."
                : "This project is URL-only. Link it to an installed GitHub repository metadata record before enabling future private import."}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              <Badge variant="outline" className="bg-white/70 text-slate-700 border-white">
                <Lock className="w-3 h-3 mr-1" />
                no private files imported
              </Badge>
              {activeLink && (
                <Badge variant="outline" className="bg-white/70 text-slate-700 border-white">
                  <GitBranch className="w-3 h-3 mr-1" />
                  {activeLink.repository_full_name || "linked repository"}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:flex-shrink-0">
          <Link to="/github/repositories">
            <Button variant="outline" size="sm" className="cursor-pointer bg-white/70 w-full sm:w-auto">
              GitHub Repos
            </Button>
          </Link>
          <Link to="/diagnostics">
            <Button variant="outline" size="sm" className="cursor-pointer bg-white/70 w-full sm:w-auto">
              Diagnostics
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
