import { useMemo } from "react";
import { useParams } from "react-router-dom";
import ImpactAnalysis from "@/pages/ImpactAnalysis";
import ContextEfficiencyCard from "@/components/projects/ContextEfficiencyCard";
import { useProjectFiles } from "@/hooks/useProjectFiles";
import { pickImpactBaselineContextFiles } from "@/lib/contextSelectionPresets";

export default function ImpactAnalysisWithEfficiency() {
  const { id } = useParams();
  const files = useProjectFiles(id);
  const selectedFiles = useMemo(() => pickImpactBaselineContextFiles(files), [files]);

  return (
    <div className="space-y-6">
      {files.length > 0 && (
        <ContextEfficiencyCard
          allFiles={files}
          selectedFiles={selectedFiles}
          title="Baseline Context Efficiency Estimate"
          description="A rough pre-input estimate. The live Context Pack Inspector below shows the actual files selected for the current diff or file list."
        />
      )}
      <ImpactAnalysis />
    </div>
  );
}
