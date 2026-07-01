# Phase 44: Shared Project Quality List Utilities

This phase removes inline Home quality filtering and sorting logic.

## Implemented

- `src/lib/projectQualityListUtils.js`
- `src/pages/Home.jsx` now imports shared filter and sort definitions

The shared utility provides:

- filter options
- sort options
- project quality decoration
- filtering
- sorting
- combined list control application

## Why this matters

Home had its own embedded quality list logic. Moving it into a utility makes future workspace pages and tables reuse the same behavior instead of duplicating scoring and tier rules.
