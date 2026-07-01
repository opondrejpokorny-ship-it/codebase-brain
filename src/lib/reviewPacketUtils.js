import { buildPrCommentDraft } from '@/lib/prCommentDraftUtils';
import { buildReadinessRows, summarizeReadiness } from '@/lib/readinessPreviewUtils';

function itemLabel(item = {}) {
  const meta = item.pr_metadata || {};
  const repo = meta.repositoryFullName || item.repository || 'unknown/repo';
  const number = meta.prNumber || item.pr_number || '?';
  return `${repo}#${number}`;
}

export function buildReviewPacket({ item = {}, approval = null } = {}) {
  const meta = item.pr_metadata || {};
  const readinessRows = buildReadinessRows({
    approved: approval?.status === 'approved' && Boolean(String(approval?.draft || '').trim()),
    identified: Boolean(meta.repositoryFullName && meta.prNumber),
    repositoryOk: item.repository_compatibility?.status !== 'mismatch',
    finalStepAvailable: false,
    label: meta.repositoryFullName && meta.prNumber ? `${meta.repositoryFullName}#${meta.prNumber}` : '',
  });
  return {
    id: item.id || itemLabel(item),
    label: itemLabel(item),
    title: meta.title || item.title || 'Untitled review item',
    link: meta.htmlUrl || item.html_url || '',
    level: item.risk_level || item.inbox_status || 'unknown',
    summary: item.result || '',
    changed_files: item.changed_files || meta.changedFiles || [],
    related_files: item.related_files || item.relevant_files || [],
    suggested_tests: item.suggested_tests || item.tests || [],
    comment_draft: approval?.draft || buildPrCommentDraft(item),
    readiness_rows: readinessRows,
    readiness_summary: summarizeReadiness(readinessRows),
  };
}

export function buildReviewPacketMarkdown(packet = {}) {
  const lines = [];
  lines.push(`# Review Packet: ${packet.label || 'Unknown item'}`);
  lines.push('');
  lines.push(`- Title: ${packet.title || 'Untitled'}`);
  lines.push(`- Level: ${packet.level || 'unknown'}`);
  lines.push(`- Link: ${packet.link || 'n/a'}`);
  lines.push(`- Readiness: ${packet.readiness_summary?.label || 'unknown'}`);
  lines.push('');
  lines.push('## Changed files');
  (packet.changed_files || []).slice(0, 30).forEach((file) => lines.push(`- ${file}`));
  lines.push('');
  lines.push('## Related files');
  (packet.related_files || []).slice(0, 30).forEach((file) => lines.push(`- ${file}`));
  lines.push('');
  lines.push('## Comment draft');
  lines.push(packet.comment_draft || 'No draft available.');
  return lines.join('\n');
}
