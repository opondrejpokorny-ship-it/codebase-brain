// @ts-nocheck
import { safeCreateEntity } from '@/lib/optionalEntityRuntime';

export async function saveDecisionRecord(projectId, record = {}) {
  const result = await safeCreateEntity('DecisionMemory', { ...record, project_id: projectId });
  return {
    saved: result.saved || record,
    source: result.source,
    error: result.error,
    persisted: result.source === 'persisted_storage' && Boolean(result.saved),
  };
}
