// @ts-nocheck
import { safeCreateEntity } from '@/lib/optionalEntityRuntime';

export function decisionPersistenceSourceLabel(source = '') {
  if (source === 'persisted_storage') return 'persisted';
  if (source === 'local_fallback') return 'local fallback';
  if (source === 'missing_entity') return 'local only';
  return source || 'unknown';
}

export async function saveDecisionRecord(projectId, record = {}) {
  const result = await safeCreateEntity('DecisionMemory', { ...record, project_id: projectId });
  const source = result.source || 'local_fallback';
  return {
    saved: result.saved || record,
    source,
    sourceLabel: decisionPersistenceSourceLabel(source),
    error: result.error,
    persisted: source === 'persisted_storage' && Boolean(result.saved),
  };
}
