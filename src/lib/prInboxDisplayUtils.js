// @ts-nocheck
import { prAnalysisKey } from '@/lib/prAnalysisOverlayUtils';

export function prInboxItemLabel(item = {}) {
  const meta = item.pr_metadata || {};
  const repo = meta.repositoryFullName || item.repository || 'unknown/repo';
  const number = meta.prNumber || item.pr_number || '?';
  return `${repo}#${number}`;
}

export function prInboxItemTitle(item = {}) {
  return item.pr_metadata?.title || item.title || 'Untitled pull request';
}

export function prInboxItemUrl(item = {}) {
  return item.pr_metadata?.htmlUrl || item.html_url || '';
}

export function prInboxItemStatus(item = {}) {
  if (item.inbox_status) return item.inbox_status;
  if (item.risk_level === 'pending') return 'pending_review';
  return item.risk_level || 'unknown';
}

export function prInboxChangedFileCount(item = {}) {
  return item.pr_metadata?.changedFilesCount || item.changed_files?.length || 0;
}

export function prInboxGraphLensUrl(projectId, item = {}) {
  return `/project/${projectId}/graph?pr=${encodeURIComponent(prAnalysisKey(item))}`;
}
