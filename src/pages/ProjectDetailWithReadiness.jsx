import { useMemo } from "react";
import { useParams } from "react-router-dom";
import ProjectDetail from "@/pages/ProjectDetail";
import PrivateImportReadinessCard from "@/components/projects/PrivateImportReadinessCard";
import ContextEfficiencyCard from "@/components/projects/ContextEfficiencyCard";
import SmartContextActions from "@/components/projects/SmartContextActions";
import { useProjectReadinessContext } from "@/hooks/useProjectReadinessContext";
import { pickDefaultProjectContextFiles } from "@/lib/contextSelectionPresets";

export default function ProjectDetailWithReadiness() {
  const { id } = useParams();
  const { project, files, repositoryLinks } = useProjectReadinessContext(id);
  const selectedFiles = useMemo(() => pickDefaultProjectContextFiles(files), [files]);

  return (
    <div className="space-y-6">
      {project && <PrivateImportReadinessCard project={project} repositoryLinks={repositoryLinks} />}
      {files.length > 0 && (
        <div className="space-y-3">
          <ContextEfficiencyCard
            allFiles={files}
            selectedFiles={selectedFiles}
            title="Context Efficiency Meter"
            description="Estimated token savings when Codebase Brain sends a focused project context instead of every stored file."
          />
          <SmartContextActions projectId={id} />
        </div>
      )}
      <ProjectDetail />
    </div>
  );
}
