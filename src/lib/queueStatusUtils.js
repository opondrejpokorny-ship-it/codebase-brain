// @ts-nocheck

export const QUEUE_STATUS_LABELS = {
  event_received: 'Event received',
  pending_review: 'Pending review',
  analyzing: 'Analyzing',
  analyzed: 'Analyzed',
  failed: 'Failed',
  repo_mismatch: 'Repository warning',
  closed: 'Closed',
  unknown: 'Unknown',
};

export function queueStatusLabel(status = 'unknown') {
  return QUEUE_STATUS_LABELS[status] || String(status || 'unknown').replace(/_/g, ' ');
}

export function isFinalQueueStatus(status = '') {
  return ['analyzed', 'failed', 'closed'].includes(status);
}

export function queueStatusTone(status = '') {
  if (status === 'analyzed') return 'success';
  if (status === 'failed' || status === 'repo_mismatch') return 'warning';
  if (status === 'analyzing') return 'active';
  return 'neutral';
}
