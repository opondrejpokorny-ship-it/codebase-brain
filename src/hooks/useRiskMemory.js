import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  buildRiskMemory,
  mergeAnalysisHistories,
  readLocalAnalysisHistory,
} from "@/lib/analysisHistoryUtils";

function optionalEntity(entityName) {
  try {
    return base44?.entities?.[entityName] || null;
  } catch {
    return null;
  }
}

export function useRiskMemory(projectId) {
  const [project, setProject] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historySource, setHistorySource] = useState("local fallback");

  useEffect(() => {
    let cancelled = false;

    async function loadRiskMemory() {
      setLoading(true);
      try {
        const [projects] = await Promise.all([
          base44.entities.CodebaseProject.filter({ id: projectId }).catch(() => []),
        ]);

        const analysisEntity = optionalEntity("CodebaseAnalysis");
        const remoteAnalyses = analysisEntity?.filter
          ? await analysisEntity.filter({ project_id: projectId }, "created_date", 80).catch(() => [])
          : [];
        const localAnalyses = readLocalAnalysisHistory(projectId);
        const merged = mergeAnalysisHistories(remoteAnalyses || [], localAnalyses || []);

        if (!cancelled) {
          setProject(projects?.[0] || null);
          setAnalyses(merged);
          setHistorySource(remoteAnalyses?.length ? "Base44 + local fallback" : "local fallback");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRiskMemory();
    return () => { cancelled = true; };
  }, [projectId]);

  const memory = useMemo(() => buildRiskMemory(analyses), [analyses]);

  return { project, analyses, memory, loading, historySource };
}
