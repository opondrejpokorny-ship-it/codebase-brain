# Phase 30b: Quality Controls Refactor

This phase stabilizes the Home quality controls that are already present on `main`.

## Implemented

### Shared quality list utilities

Added `src/lib/projectQualityListUtils.js` with reusable helpers for:

- quality filter definitions
- quality sort definitions
- project quality decoration
- filtering
- sorting
- combined list-control application

### Home cleanup

`src/pages/Home.jsx` now imports shared quality list utilities instead of keeping scoring, filtering, and sorting helper functions inline.

The existing Home behavior stays the same:

- filter by quality tier
- filter projects needing attention
- sort by quality
- sort by name
- sort by newest first
- preserve the workspace onboarding checklist and workspace quality overview

## Why this matters

The quality controls are now reusable by future workspace pages and reports. Home stays focused on rendering UI, while quality list behavior lives in a testable utility module.

## Next phase options

1. Add persistent local preferences for selected filter and sort.
2. Build a dedicated Workspace Quality page.
3. Add quality trend snapshots.
4. Add team onboarding and workspace settings.
