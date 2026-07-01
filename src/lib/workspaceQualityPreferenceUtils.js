const STORAGE_KEY = 'codebase_brain_workspace_quality_preferences_v1';

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

export function readWorkspaceQualityPreference(key, fallback) {
  if (!canStore()) return fallback;
  const preferences = safeParse(window.localStorage.getItem(STORAGE_KEY) || '{}', {});
  return preferences[key] ?? fallback;
}

export function writeWorkspaceQualityPreference(key, value) {
  if (!canStore()) return false;
  const preferences = safeParse(window.localStorage.getItem(STORAGE_KEY) || '{}', {});
  preferences[key] = value;
  preferences.updated_at = new Date().toISOString();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  return true;
}

export function clearWorkspaceQualityPreferences() {
  if (!canStore()) return false;
  window.localStorage.removeItem(STORAGE_KEY);
  return true;
}
