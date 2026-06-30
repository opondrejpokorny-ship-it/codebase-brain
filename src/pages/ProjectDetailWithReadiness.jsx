import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import ProjectDetail from "@/pages/ProjectDetail";
import PrivateImportReadinessCard from "@/components/projects/PrivateImportReadinessCard";

export default function ProjectDetailWithReadiness() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [repositoryLinks, setRepositoryLinks] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadReadinessContext() {
      try {
        const [projects, links] = await Promise.all([
          base44.entities.CodebaseProject.filter({ id }),
          base44.entities.GitHubRepositoryLink?.filter
            ? base44.entities.GitHubRepositoryLink.filter({ project_id: id }).catch(() => [])
            : Promise.resolve([]),
        ]);

        if (!cancelled) {
          setProject(projects?.[0] || null);
          setRepositoryLinks(links || []);
        }
      } catch {
        if (!cancelled) {
          setProject(null);
          setRepositoryLinks([]);
        }
      }
    }

    loadReadinessContext();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="space-y-6">
      {project && (
        <PrivateImportReadinessCard project={project} repositoryLinks={repositoryLinks} />
      )}
      <ProjectDetail />
    </div>
  );
}
