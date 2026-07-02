// @ts-nocheck

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function riskMemoryFilesForItem(item = {}) {
  return [
    ...asArray(item.changed_files),
    ...asArray(item.relevant_files),
    ...asArray(item.related_files),
  ].filter(Boolean);
}

export function buildRiskMemoryCrossLinkQuery(item = {}) {
  const files = [...new Set(riskMemoryFilesForItem(item))];
  const verdict = item.review_verdict || item.verdict || item.risk_level || 'unknown';
  return {
    files,
    verdict,
    pr: item.pr_metadata?.repositoryFullName && item.pr_metadata?.prNumber
      ? `${item.pr_metadata.repositoryFullName}#${item.pr_metadata.prNumber}`
      : null,
  };
}

export function summarizeRiskMemoryCrossLink(item = {}) {
  const query = buildRiskMemoryCrossLinkQuery(item);
  if (!query.files.length) return 'No file-level history query available yet.';
  return `Look for ${query.verdict} risks touching ${query.files.slice(0, 3).join(', ')}${query.files.length > 3 ? ` +${query.files.length - 3} more` : ''}.`;
}
