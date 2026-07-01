import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  buildRiskMemory,
  mergeAnalysisHistories,
  readLocalAnalysisHistory,
} from "@/lib/analysisHistoryUtils";
import { extractChangedFiles } from "@/lib/impactAnalysisUtils";
import { detectChangedSymbols } from "@/lib/changedSymbolUtils";
import { entitySourceLabel, safeFilterEntity } from "@/lib/optionalEntityRuntime";

function backfillChangedSymbols(analyses = [], files = []) {
  if (!files.length) return analyses;
  return analyses.map((analysis) => {
    if (Array.isArray(analysis.changed_symbols) && analysis.changed_symbols.length > 0) return analysis;
    const input = analysis.input || "";
    if (!input) return analysis;
    const changedFiles = analysis.changed_files?.length ? analysis.changed_files : extractChangedFiles(input);
    const changedSymbols = detectChangedSymbols({ files, changedFiles, diffText: input });
    return changedSymbols.length ? { ...analysis, changed_symbols: changedSymbols, symbol_backfilled: true } : analysis;
  });
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
        const [projects, files, remoteResult] = await Promise.all([
          base44.entities.CodebaseProject.filter({ id: projectId }).catch(() => []),
          base44.entities.CodeFile.filter({ project_id: projectId }).catch(() => []),
          safeFilterEntity("CodebaseAnalysis", { project_id: projectId }, "created_date", 80),
        ]);

        const remoteAnalyses = remoteResult.records || [];
        const localAnalyses = readLocalAnalysisHistory(projectId);
        const merged = mergeAnalysisHistories(remoteAnalyses, localAnalyses || []);
        const enriched = backfillChangedSymbols(merged, files || []);

        if (!cancelled) {
          setProject(projects?.[0] || null);
          setAnalyses(enriched);
          setHistorySource(entitySourceLabel({ remoteCount: remoteAnalyses.length, localCount: localAnalyses.length }));
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
