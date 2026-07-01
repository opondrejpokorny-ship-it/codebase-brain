const STORAGE_KEY = 'codebase_brain_pr_comment_approvals_v1';

function safeParse(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function canStore() {
  try { return typeof window !== 'undefined' && Boolean(window.localStorage); } catch { return false; }
}

export function commentApprovalKey(item = {}) {
  const meta = item.pr_metadata || {};
  const repo = meta.repositoryFullName || item.repository || '';
  const number = meta.prNumber || item.pr_number || '';
  if (repo && number) return `${repo}#${number}`;
  return item.id || `${item.created_date || ''}|${item.input || ''}`;
}

export function readLocalCommentApprovals(projectId) {
  if (!projectId || !canStore()) return {};
  const all = safeParse(window.localStorage.getItem(STORAGE_KEY) || '{}', {});
  const projectApprovals = all[projectId];
  return projectApprovals && typeof projectApprovals === 'object' ? projectApprovals : {};
}

export function readLocalCommentApproval(projectId, item) {
  const approvals = readLocalCommentApprovals(projectId);
  return approvals[commentApprovalKey(item)] || null;
}

export function writeLocalCommentApproval(projectId, item, draft, status = 'approved') {
  if (!projectId || !item || !canStore()) return null;
  const all = safeParse(window.localStorage.getItem(STORAGE_KEY) || '{}', {});
  const projectApprovals = all[projectId] && typeof all[projectId] === 'object' ? all[projectId] : {};
  const key = commentApprovalKey(item);
  const existing = projectApprovals[key] || {};
  const record = {
    ...existing,
    id: existing.id || `approval_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    key,
    project_id: projectId,
    pr_metadata: item.pr_metadata || null,
    draft: String(draft || ''),
    status,
    created_date: existing.created_date || new Date().toISOString(),
    updated_date: new Date().toISOString(),
    github_writes_enabled: false,
  };
  projectApprovals[key] = record;
  all[projectId] = projectApprovals;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return record;
}

export function summarizeCommentApprovals(projectId, items = []) {
  const approvals = readLocalCommentApprovals(projectId);
  let approved = 0;
  let draftSaved = 0;
  for (const item of items) {
    const approval = approvals[commentApprovalKey(item)];
    if (!approval) continue;
    if (approval.status === 'approved') approved += 1;
    else draftSaved += 1;
  }
  return { approved, draftSaved };
}
