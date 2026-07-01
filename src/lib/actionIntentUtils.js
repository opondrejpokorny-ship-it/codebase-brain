export const ACTION_INTENT_MODE = 'preview_only';

export function buildActionIntent({ label = '', target = '', body = '', reason = '' } = {}) {
  return {
    id: `intent-${Date.now()}`,
    mode: ACTION_INTENT_MODE,
    enabled: false,
    label,
    target,
    body,
    reason,
    created_at: new Date().toISOString(),
  };
}

export function summarizeActionIntent(intent = {}) {
  return {
    ready: Boolean(intent.label && intent.target && intent.body),
    enabled: Boolean(intent.enabled),
    mode: intent.mode || ACTION_INTENT_MODE,
    label: intent.enabled ? 'Ready' : 'Preview only',
  };
}

export function buildCommentIntentFromPacket(packet = {}) {
  return buildActionIntent({
    label: `Share review packet for ${packet.label || 'item'}`,
    target: packet.link || packet.label || '',
    body: packet.comment_draft || '',
    reason: 'Prepared from internal review packet',
  });
}
