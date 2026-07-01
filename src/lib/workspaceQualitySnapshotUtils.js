const STORAGE_KEY = 'codebase_brain_workspace_quality_snapshots_v1';
const MAX_SNAPSHOTS = 12;

function canStore() {
  try { return typeof window !== 'undefined' && Boolean(window.localStorage); } catch { return false; }
}

function safeParse(value, fallback = []) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function tierCount(overview = {}, label) {
  return overview.tiers?.[label] || 0;
}

function normalizeSnapshot(snapshot = {}) {
  return {
    id: snapshot.id || `${snapshot.created_at || Date.now()}`,
    created_at: snapshot.created_at || new Date().toISOString(),
    average: Number(snapshot.average || 0),
    total: Number(snapshot.total || 0),
    needs_attention: Number(snapshot.needs_attention || 0),
    tiers: {
      product_ready: Number(snapshot.tiers?.product_ready || 0),
      strong_beta: Number(snapshot.tiers?.strong_beta || 0),
      mvp_plus: Number(snapshot.tiers?.mvp_plus || 0),
      needs_hardening: Number(snapshot.tiers?.needs_hardening || 0),
    },
  };
}

export function buildWorkspaceQualitySnapshot(overview = {}) {
  const createdAt = new Date().toISOString();
  return normalizeSnapshot({
    id: createdAt,
    created_at: createdAt,
    average: overview.average,
    total: overview.total,
    needs_attention: overview.needsAttention?.length || 0,
    tiers: {
      product_ready: tierCount(overview, 'Product-ready'),
      strong_beta: tierCount(overview, 'Strong beta'),
      mvp_plus: tierCount(overview, 'MVP+'),
      needs_hardening: tierCount(overview, 'Needs hardening'),
    },
  });
}

export function readWorkspaceQualitySnapshots(limit = MAX_SNAPSHOTS) {
  if (!canStore()) return [];
  const snapshots = safeParse(window.localStorage.getItem(STORAGE_KEY) || '[]', []);
  return snapshots.map(normalizeSnapshot).slice(0, limit);
}

export function saveWorkspaceQualitySnapshot(overview = {}, limit = MAX_SNAPSHOTS) {
  if (!canStore()) return [];
  const snapshot = buildWorkspaceQualitySnapshot(overview);
  const snapshots = [snapshot, ...readWorkspaceQualitySnapshots(limit)].slice(0, limit);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
  return snapshots;
}

export function compareWorkspaceQualityToSnapshot(overview = {}, snapshot = null) {
  if (!snapshot) return { hasSnapshot: false, delta: 0, direction: 'flat' };
  const delta = Number(overview.average || 0) - Number(snapshot.average || 0);
  return {
    hasSnapshot: true,
    delta,
    direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
  };
}

export function formatSnapshotTime(value) {
  if (!value) return 'Never';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}
