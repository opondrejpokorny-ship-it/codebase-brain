// @ts-nocheck

export function itemLabel(item = {}) {
  const meta = item.pr_metadata || {};
  const repo = meta.repositoryFullName || item.repository || 'unknown/repo';
  const number = meta.prNumber || item.pr_number || '?';
  return `${repo}#${number}`;
}

export function itemTitle(item = {}) {
  return item.pr_metadata?.title || item.title || 'Untitled item';
}

export function itemUrl(item = {}) {
  return item.pr_metadata?.htmlUrl || item.html_url || '';
}

export function itemStatus(item = {}) {
  if (item.inbox_status) return item.inbox_status;
  if (item.risk_level === 'pending') return 'pending_review';
  return item.risk_level || 'unknown';
}

export function normalizeDisplayItem(item = {}) {
  return {
    ...item,
    inbox_status: itemStatus(item),
  };
}

export function canRunItem(item = {}) {
  const status = itemStatus(item);
  return Boolean(item.input) && (status.includes('pending') || status.includes('mismatch') || status === 'unknown');
}
