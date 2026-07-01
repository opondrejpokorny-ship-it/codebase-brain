# Phase 32: Persist Home Quality Preferences

This phase makes the Home dashboard feel more product-like by remembering the user's project list preferences.

## Implemented

### Home preference helpers

Added `src/lib/homePreferenceUtils.js`.

It provides:

- safe localStorage availability checks
- safe JSON parsing
- `readHomePreference`
- `writeHomePreference`

Preferences are stored under:

`codebase_brain_home_preferences_v1`

### Persisted project list controls

`src/pages/Home.jsx` now persists:

- selected quality filter
- selected sort mode

The values are restored on page load and updated whenever the user changes the controls.

## Why this matters

A production product should preserve workflow context. If a user works mostly from `Needs action` or `Lowest quality first`, the dashboard should remember that preference instead of resetting every time.

## Next phase options

1. Persist dismissed onboarding state.
2. Add project card quick links to Quality / PR Inbox.
3. Add quality trend snapshots.
4. Add workspace settings page.
