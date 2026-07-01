const STORAGE_KEY = 'codebase_brain_workspace_options_v1';

export const DEFAULT_WORKSPACE_OPTIONS = {
  workspace_name: 'Codebase Brain Workspace',
  quality_target: 70,
  review_cadence: 'weekly',
  team_notes: '',
};

function canStore() {
  try { return typeof window !== 'undefined' && Boolean(window.localStorage); } catch { return false; }
}

function safeParse(value, fallback = {}) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function readWorkspaceOptions() {
  if (!canStore()) return DEFAULT_WORKSPACE_OPTIONS;
  const stored = safeParse(window.localStorage.getItem(STORAGE_KEY) || '{}', {});
  return { ...DEFAULT_WORKSPACE_OPTIONS, ...stored };
}

export function writeWorkspaceOptions(options = {}) {
  if (!canStore()) return false;
  const next = {
    ...readWorkspaceOptions(),
    ...options,
    quality_target: Number(options.quality_target ?? readWorkspaceOptions().quality_target),
    updated_at: new Date().toISOString(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return true;
}

export function resetWorkspaceOptions() {
  if (!canStore()) return false;
  window.localStorage.removeItem(STORAGE_KEY);
  return true;
}
