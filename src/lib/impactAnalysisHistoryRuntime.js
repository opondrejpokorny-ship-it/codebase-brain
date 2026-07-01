import {
  createAnalysisHistoryRecord,
  mergeAnalysisHistories,
  writeLocalAnalysisRecord,
} from "@/lib/analysisHistoryUtils";
import { optionalEntity } from "@/lib/impactAnalysisRuntimeUtils";

export function buildImpactAnalysisHistoryRecord({ projectId, prMeta, compatibility, changeInput, calibrated, payload }) {
  return createAnalysisHistoryRecord({
    projectId,
    type: prMeta ? "public_github_pr_impact" : "manual_diff_impact",
    input: changeInput,
    result: calibrated.text,
    riskLevel: calibrated.riskLevel,
    changedFiles: payload.changedFiles,
    relatedFiles: payload.relatedPaths,
    riskSignals: payload.signals,
    relevantRelations: payload.relevantRelations.map((relation) => `${relation.from_file}->${relation.to_file || relation.import_path}`),
    relevantFiles: payload.relevantFiles.map((file) => file.path),
    contextPack: payload.contextPack,
    contextDepth: payload.contextPack?.depth || "balanced",
    contextDepthPreset: payload.contextPack?.depthPreset || "Balanced",
    contextSelectedTokens: payload.contextPack?.efficiency?.selectedFileTokens || payload.contextPack?.efficiency?.selectedTokens || payload.contextPack?.estimatedTokens || null,
    contextTotalTokens: payload.contextPack?.efficiency?.totalContextTokens || payload.contextPack?.efficiency?.selectedTotalTokens || null,
    contextFullRepoTokens: payload.contextPack?.efficiency?.fullRepoTokens || null,
    contextSavingsPercent: payload.contextPack?.efficiency?.savingsPercent || null,
    repositoryCompatibility: prMeta ? compatibility : null,
    prMetadata: prMeta ? {
      repositoryFullName: prMeta.repositoryFullName,
      prNumber: prMeta.prNumber,
      title: prMeta.title,
      state: prMeta.state,
      htmlUrl: prMeta.htmlUrl,
      baseRef: prMeta.baseRef,
      headRef: prMeta.headRef,
      changedFilesCount: prMeta.changedFilesCount,
      additions: prMeta.additions,
      deletions: prMeta.deletions,
      truncated: prMeta.truncated,
      source: prMeta.source,
      backendError: prMeta.backendError || null,
    } : null,
  });
}

export async function persistImpactAnalysisHistory(projectId, historyRecord, setAnalyses) {
  const localSaved = writeLocalAnalysisRecord(projectId, historyRecord);
  if (localSaved) setAnalyses((prev) => mergeAnalysisHistories([localSaved], prev).slice(0, 20));

  try {
    const analysisEntity = optionalEntity("CodebaseAnalysis");
    if (!analysisEntity?.create) return;
    const saved = await analysisEntity.create(historyRecord);
    setAnalyses((prev) => mergeAnalysisHistories([saved], prev).slice(0, 20));
  } catch {
    // Local Risk Memory already saved the report.
  }
}
