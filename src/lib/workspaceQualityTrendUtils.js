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

function readSnapshots() {
  if (!canStore()) return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY) || '[]', []);
}

function writeSnapshots(snapshots = []) {
  if (!canStore()) return false;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots.slice(0, MAX_SNAPSHOTS)));
  return true;
}

export function buildWorkspaceQualitySnapshot(overview = {}) {
  return {
    id: `workspace-quality-${Date.now()}`,
    created_at: new Date().toISOString(),
    average: overview.average || 0,
    total: overview.total || 0,
    tiers: overview.tiers || {},
    needs_attention: overview.needsAttention?.length || 0,
    strongest: overview.strongest?.[0]?.project?.name || '',
  };
}

export function listWorkspaceQualitySnapshots() {
  return readSnapshots();
}

export function saveWorkspaceQualitySnapshot(overview = {}) {
  const snapshot = buildWorkspaceQualitySnapshot(overview);
  const snapshots = [snapshot, ...readSnapshots()].slice(0, MAX_SNAPSHOTS);
  writeSnapshots(snapshots);
  return snapshot;
}

export function clearWorkspaceQualitySnapshots() {
  return writeSnapshots([]);
}

export function summarizeWorkspaceQualityTrend(overview = {}, snapshots = []) {
  const previous = snapshots[0] || null;
  if (!previous) {
    return {
      previous: null,
      delta: 0,
      direction: 'none',
      label: 'No saved snapshot yet',
    };
  }

  const delta = (overview.average || 0) - (previous.average || 0);
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  return {
    previous,
    delta,
    direction,
    label: delta === 0 ? 'No change since last snapshot' : `${delta > 0 ? '+' : ''}${delta} pts since last snapshot`,
  };
}

export function formatSnapshotDate(value) {
  if (!value) return 'Unknown date';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}
