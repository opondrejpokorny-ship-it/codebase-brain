// @ts-nocheck
import { safeCreateEntity } from '@/lib/optionalEntityRuntime';

export async function saveQueueRecord(record = {}) {
  const result = await safeCreateEntity('CodebaseAnalysis', record);
  return {
    saved: result.saved || record,
    source: result.source,
    error: result.error,
    persisted: result.source === 'persisted_storage' && Boolean(result.saved),
  };
}
