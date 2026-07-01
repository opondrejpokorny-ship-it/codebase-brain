function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asAny(value) {
  return /** @type {any} */ (value || {});
}

function itemTime(entry = {}) {
  const time = new Date(asAny(entry).created_date || asAny(entry).updated_date || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function prAnalysisKey(item = {}) {
  const safeItem = asAny(item);
  const meta = asAny(safeItem.pr_metadata);
  const repo = meta.repositoryFullName || safeItem.repository || '';
  const number = meta.prNumber || safeItem.pr_number || '';
  if (repo && number) return `${repo}#${number}`;
  return safeItem.id || `${safeItem.created_date || ''}|${String(safeItem.input || '').slice(0, 80)}`;
}

export function prAnalysisLabel(item = {}) {
  const safeItem = asAny(item);
  const meta = asAny(safeItem.pr_metadata);
  const repo = meta.repositoryFullName || safeItem.repository || 'unknown/repo';
  const number = meta.prNumber || safeItem.pr_number || '?';
  return `${repo}#${number}`;
}

export function prAnalysisTitle(item = {}) {
  const safeItem = asAny(item);
  return asAny(safeItem.pr_metadata).title || safeItem.title || 'Untitled pull request';
}

export function prAnalysisUrl(item = {}) {
  const safeItem = asAny(item);
  return asAny(safeItem.pr_metadata).htmlUrl || safeItem.html_url || '';
}

export function normalizePrAnalysisItem(item = {}) {
  const safeItem = asAny(item);
  return {
    ...safeItem,
    overlay_key: prAnalysisKey(safeItem),
    overlay_label: prAnalysisLabel(safeItem),
    overlay_title: prAnalysisTitle(safeItem),
    inbox_status: safeItem.inbox_status || (safeItem.risk_level === 'pending' ? 'pending_review' : safeItem.risk_level || 'unknown'),
  };
}

export function filterPrAnalysisItems(items = []) {
  return asArray(items)
    .filter((item) => item?.pr_metadata || item?.type === 'pr_inbox_pending' || item?.type === 'public_github_pr_impact')
    .map(normalizePrAnalysisItem)
    .sort((a, b) => itemTime(b) - itemTime(a));
}

export function verdictFromPrAnalysis(item = {}) {
  const safeItem = asAny(item);
  const explicit = String(safeItem.review_verdict || safeItem.verdict || safeItem.ai_verdict || '').toUpperCase();
  if (['SAFE', 'REVIEW', 'BLOCK'].includes(explicit)) return explicit;
  const status = String(safeItem.inbox_status || '').toLowerCase();
  const risk = String(safeItem.risk_level || '').toLowerCase();
  if (status.includes('mismatch') || status.includes('block') || risk === 'high' || risk === 'critical') return 'BLOCK';
  if (risk === 'low' || risk === 'safe') return 'SAFE';
  return 'REVIEW';
}

export function overlayTextFromPrAnalysis(item = {}) {
  const safeItem = asAny(item);
  const changedFiles = asArray(safeItem.changed_files).filter(Boolean);
  if (changedFiles.length) return changedFiles.join('\n');
  const relevantFiles = asArray(safeItem.relevant_files).filter(Boolean);
  if (relevantFiles.length) return relevantFiles.join('\n');
  return String(safeItem.input || safeItem.diff || safeItem.patch || '').trim();
}

export function summarizePrAnalysisForOverlay(item = {}) {
  const safeItem = normalizePrAnalysisItem(item);
  return {
    key: safeItem.overlay_key,
    label: safeItem.overlay_label,
    title: safeItem.overlay_title,
    url: prAnalysisUrl(safeItem),
    status: safeItem.inbox_status,
    risk: safeItem.risk_level || 'unknown',
    verdict: verdictFromPrAnalysis(safeItem),
    changedFiles: asArray(safeItem.changed_files).length,
  };
}
