const STORAGE_KEY = 'codebase_brain_home_preferences_v1';

function canStore() {
  try { return typeof window !== 'undefined' && Boolean(window.localStorage); } catch { return false; }
}

function safeParse(value, fallback = {}) {
  try { return JSON.parse(value); } catch { return fallback; }
}

export function readHomePreference(key, fallback) {
  if (!canStore()) return fallback;
  const preferences = safeParse(window.localStorage.getItem(STORAGE_KEY) || '{}', {});
  return preferences[key] ?? fallback;
}

export function writeHomePreference(key, value) {
  if (!canStore()) return false;
  const preferences = safeParse(window.localStorage.getItem(STORAGE_KEY) || '{}', {});
  preferences[key] = value;
  preferences.updated_at = new Date().toISOString();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  return true;
}
