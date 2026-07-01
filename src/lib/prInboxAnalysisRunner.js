import { base44 } from '@/api/base44Client';
import { buildCodeRelations, relatedPathsForChangedFiles } from '@/lib/codeGraphUtils';
import { buildImpactAnalysisPromptWithDepth } from '@/lib/impactAnalysisPromptBuilder';
import { calibrateImpactAnalysisOutput, extractChangedFiles, heuristicRiskSignals } from '@/lib/impactAnalysisUtils';
import { detectChangedSymbols } from '@/lib/changedSymbolUtils';
import { formatRiskMemoryForPrompt, mergeAnalysisHistories, readLocalAnalysisHistory } from '@/lib/analysisHistoryUtils';
import { formatProjectRulesForPrompt, getProjectRulesForRuntime } from '@/lib/projectRulesUtils';
import { optionalEntity } from '@/lib/impactAnalysisRuntimeUtils';
import { buildImpactAnalysisHistoryRecord } from '@/lib/impactAnalysisHistoryRuntime';
import { writeLocalPrInboxItem } from '@/lib/prInboxStorage';

function llmText(value) {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

function prMetaFromInboxItem(item = {}) {
  return item.pr_metadata || null;
}

function analysisStatusForRisk(riskLevel = 'medium') {
  return riskLevel === 'high' ? 'analyzed_high_risk' : riskLevel === 'low' ? 'analyzed_low_risk' : 'analyzed_medium_risk';
}

async function loadRemoteHistory(projectId) {
  const analysisEntity = optionalEntity('CodebaseAnalysis');
  if (!analysisEntity?.filter) return [];
  return analysisEntity.filter({ project_id: projectId }, 'created_date', 40).catch(() => []);
}

export async function runPrInboxAnalysis({ projectId, project, files = [], item, contextDepth = 'balanced' }) {
  const changeInput = String(item?.input || '');
  if (!projectId) throw new Error('Missing project_id');
  if (!project) throw new Error('Project is not loaded');
  if (!changeInput.trim()) throw new Error('Queued PR item does not contain a stored diff. Re-queue the PR URL.');

  const codeRelations = buildCodeRelations(files);
  const changedFiles = extractChangedFiles(changeInput);
  const changedSymbols = detectChangedSymbols({ files, changedFiles, diffText: changeInput });
  const signals = heuristicRiskSignals(changeInput, changedFiles);
  const relatedPaths = relatedPathsForChangedFiles(codeRelations, changedFiles);
  const remoteHistory = await loadRemoteHistory(projectId);
  const localHistory = readLocalAnalysisHistory(projectId);
  const analyses = mergeAnalysisHistories(remoteHistory || [], localHistory || []);
  const riskMemoryText = formatRiskMemoryForPrompt(analyses, changedFiles, relatedPaths, signals, changedSymbols);
  const projectRulesText = formatProjectRulesForPrompt(getProjectRulesForRuntime(projectId));
  const payload = buildImpactAnalysisPromptWithDepth({
    project,
    files,
    changeInput,
    relations: codeRelations,
    riskMemoryText,
    projectRulesText,
    contextDepth,
  });

  const answer = await base44.integrations.Core.InvokeLLM({ prompt: payload.prompt });
  const answerText = llmText(answer) || 'No analysis was generated.';
  const calibrated = calibrateImpactAnalysisOutput({
    text: answerText,
    heuristicRisk: payload.heuristicRisk,
    signals: payload.signals,
    changeInput,
  });

  const historyRecord = buildImpactAnalysisHistoryRecord({
    projectId,
    prMeta: prMetaFromInboxItem(item),
    compatibility: item?.repository_compatibility || null,
    changeInput,
    calibrated,
    payload,
  });
  const record = {
    ...historyRecord,
    type: 'public_github_pr_impact',
    inbox_status: analysisStatusForRisk(calibrated.riskLevel),
    source_inbox_item_id: item?.id || null,
    pr_metadata: prMetaFromInboxItem(item),
    repository_compatibility: item?.repository_compatibility || historyRecord.repository_compatibility || null,
  };

  const localSaved = writeLocalPrInboxItem(projectId, record);
  const analysisEntity = optionalEntity('CodebaseAnalysis');
  if (!analysisEntity?.create) {
    return { saved: localSaved, source: 'local_storage', calibrated, payload };
  }

  try {
    const saved = await analysisEntity.create(record);
    return { saved, source: 'CodebaseAnalysis', calibrated, payload };
  } catch {
    return { saved: localSaved, source: 'local_storage', calibrated, payload };
  }
}
