// @ts-nocheck
import { safeCreateEntity } from '@/lib/optionalEntityRuntime';

export function annotateQueueRecordSource(record = {}, source = 'local_fallback') {
  return {
    ...record,
    queue_source: source,
    persistence_source: source,
    pr_metadata: {
      ...(record.pr_metadata || {}),
      queueSource: source,
    },
  };
}

export async function saveQueueRecord(record = {}) {
  const result = await safeCreateEntity('CodebaseAnalysis', record);
  const source = result.source || 'local_fallback';
  const saved = annotateQueueRecordSource(result.saved || record, source);
  return {
    saved,
    source,
    error: result.error,
    persisted: source === 'persisted_storage' && Boolean(result.saved),
  };
}
