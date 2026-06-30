import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import ProjectDetail from "@/pages/ProjectDetail";
import PrivateImportReadinessCard from "@/components/projects/PrivateImportReadinessCard";
import ContextEfficiencyCard from "@/components/projects/ContextEfficiencyCard";
import { persistCodeRelationsIfAvailable } from "@/lib/codeRelationPersistence";

function pickDefaultContextFiles(files = []) {
  const priorityPatterns = [
    /package\.json$/i,
    /src\/app\./i,
    /src\/main\./i,
    /src\/pages\//i,
    /src\/routes\//i,
    /src\/api\//i,
    /base44\/functions\//i,
    /schema/i,
    /auth/i,
    /payment|billing|webhook/i,
  ];

  const scored = files.map((file) => {
    const path = String(file.path || "");
    const score = priorityPatterns.reduce((sum, pattern, index) => sum + (pattern.test(path) ? 20 - index : 0), 0);
    return { file, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(8, Math.max(1, files.length)))
    .map((item) => item.file);
}

export default function ProjectDetailWithReadiness() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [repositoryLinks, setRepositoryLinks] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadReadinessContext() {
      try {
        const [projects, storedFiles, links] = await Promise.all([
          base44.entities.CodebaseProject.filter({ id }),
          base44.entities.CodeFile.filter({ project_id: id }).catch(() => []),
          base44.entities.GitHubRepositoryLink?.filter
            ? base44.entities.GitHubRepositoryLink.filter({ project_id: id }).catch(() => [])
            : Promise.resolve([]),
        ]);

        if (!cancelled) {
          setProject(projects?.[0] || null);
          setFiles(storedFiles || []);
          setRepositoryLinks(links || []);
        }

        if (storedFiles?.length) {
          persistCodeRelationsIfAvailable({ projectId: id, files: storedFiles }).catch(() => null);
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

    return () => {
      cancelled = true;
    };
  }, [id]);

  const selectedFiles = useMemo(() => pickDefaultContextFiles(files), [files]);

  return (
    <div className="space-y-6">
      {project && (
        <PrivateImportReadinessCard project={project} repositoryLinks={repositoryLinks} />
      )}
      {files.length > 0 && (
        <ContextEfficiencyCard
          allFiles={files}
          selectedFiles={selectedFiles}
          title="Context Efficiency Meter"
          description="Estimated token savings when Codebase Brain sends a focused project context instead of every stored file."
        />
      )}
      <ProjectDetail />
    </div>
  );
}
