import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import ImpactAnalysis from "@/pages/ImpactAnalysis";
import ContextEfficiencyCard from "@/components/projects/ContextEfficiencyCard";

function pickImpactContextFiles(files = []) {
  const priority = [
    /package\.json$/i,
    /src\/api\//i,
    /base44\/functions\//i,
    /server|function|webhook/i,
    /auth|login|session|permission|role/i,
    /payment|checkout|refund|credit|billing|subscription/i,
    /schema|migration|database|db/i,
    /src\/pages\//i,
    /src\/components\//i,
  ];

  return files
    .map((file) => {
      const path = String(file.path || "");
      const score = priority.reduce((sum, pattern, index) => sum + (pattern.test(path) ? 30 - index : 0), 0);
      return { file, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(10, Math.max(1, files.length)))
    .map((item) => item.file);
}

export default function ImpactAnalysisWithEfficiency() {
  const { id } = useParams();
  const [files, setFiles] = useState([]);

  useEffect(() => {
    let cancelled = false;
    base44.entities.CodeFile.filter({ project_id: id })
      .then((storedFiles) => {
        if (!cancelled) setFiles(storedFiles || []);
      })
      .catch(() => {
        if (!cancelled) setFiles([]);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const selectedFiles = useMemo(() => pickImpactContextFiles(files), [files]);

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
