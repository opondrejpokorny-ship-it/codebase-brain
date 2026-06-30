import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { persistCodeRelationsIfAvailable } from "@/lib/codeRelationPersistence";

export function useProjectReadinessContext(projectId) {
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [repositoryLinks, setRepositoryLinks] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadReadinessContext() {
      try {
        const [projects, storedFiles, links] = await Promise.all([
          base44.entities.CodebaseProject.filter({ id: projectId }),
          base44.entities.CodeFile.filter({ project_id: projectId }).catch(() => []),
          base44.entities.GitHubRepositoryLink?.filter
            ? base44.entities.GitHubRepositoryLink.filter({ project_id: projectId }).catch(() => [])
            : Promise.resolve([]),
        ]);

        if (!cancelled) {
          setProject(projects?.[0] || null);
          setFiles(storedFiles || []);
          setRepositoryLinks(links || []);
        }

        if (storedFiles?.length) {
          persistCodeRelationsIfAvailable({ projectId, files: storedFiles }).catch(() => null);
        }
      } catch {
        if (!cancelled) {
          setProject(null);
          setFiles([]);
          setRepositoryLinks([]);
        }
      }
    }

    loadReadinessContext();
    return () => { cancelled = true; };
  }, [projectId]);

  return { project, files, repositoryLinks };
}
