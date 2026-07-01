const STORAGE_KEY = 'codebase_brain_pr_inbox_v1';
const MAX_ITEMS = 100;

function safeParse(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function canStore() {
  try { return typeof window !== 'undefined' && Boolean(window.localStorage); } catch { return false; }
}

function entryKey(entry = {}) {
  const meta = entry.pr_metadata || {};
  return entry.id || `${meta.repositoryFullName || entry.repository || ''}#${meta.prNumber || entry.pr_number || ''}`;
}

export function readLocalPrInbox(projectId) {
  if (!projectId || !canStore()) return [];
  const all = safeParse(window.localStorage.getItem(STORAGE_KEY) || '{}', {});
  return Array.isArray(all[projectId]) ? all[projectId] : [];
}

export function writeLocalPrInboxItem(projectId, item) {
  if (!projectId || !item || !canStore()) return item;
  const all = safeParse(window.localStorage.getItem(STORAGE_KEY) || '{}', {});
  const current = Array.isArray(all[projectId]) ? all[projectId] : [];
  const normalized = {
    ...item,
    id: item.id || `local_pr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    project_id: projectId,
    storage_source: item.storage_source || 'local_storage',
    created_date: item.created_date || new Date().toISOString(),
  };
  all[projectId] = [normalized, ...current]
    .filter((entry, index, arr) => arr.findIndex((candidate) => entryKey(candidate) === entryKey(entry)) === index)
    .slice(0, MAX_ITEMS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return normalized;
}

export function mergePrInboxItems(...groups) {
  return groups
    .flat()
    .filter(Boolean)
    .filter((entry, index, arr) => arr.findIndex((candidate) => entryKey(candidate) === entryKey(entry)) === index)
    .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
}
