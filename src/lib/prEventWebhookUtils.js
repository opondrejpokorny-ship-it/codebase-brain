// @ts-nocheck
import { buildPrEventQueueRecord, shouldQueuePrEvent } from '@/lib/prEventQueueUtils';
import { saveQueueRecord } from '@/lib/queueRecordSaveUtils';

export function buildPrEventWebhookResult({ projectId = null, event = {}, deliveryId = null, receivedAt = new Date().toISOString() } = {}) {
  const eventWithDelivery = {
    ...event,
    delivery_id: event.delivery_id || event.deliveryId || deliveryId,
  };

  if (!shouldQueuePrEvent(eventWithDelivery)) {
    return {
      queued: false,
      reason: 'unsupported_event',
      record: null,
      source: 'none',
    };
  }

  return {
    queued: true,
    reason: 'queued',
    record: buildPrEventQueueRecord({ projectId, event: eventWithDelivery, receivedAt }),
    source: 'normalized_event',
  };
}

export async function savePrEventWebhookQueueRecord(input = {}) {
  const result = buildPrEventWebhookResult(input);
  if (!result.queued || !result.record) return result;

  const saveResult = await saveQueueRecord(result.record).catch((error) => ({
    saved: result.record,
    source: 'local_fallback',
    error: error?.message || String(error),
    persisted: false,
  }));

  return {
    ...result,
    record: saveResult.saved || result.record,
    source: saveResult.source || result.source,
    persisted: Boolean(saveResult.persisted),
    error: saveResult.error || null,
  };
}
