# Phase 30: Quality List Controls

This phase hardens the Home project list into a quality-driven workspace control panel.

## Implemented

### Reusable project quality list utilities

Added `src/lib/projectQualityListUtils.js`.

It provides:

- reusable quality filter definitions
- reusable quality sort definitions
- project quality decoration
- filter handling
- sort handling
- one function to apply list controls to projects

### Home list controls

`src/pages/Home.jsx` now uses the shared utilities instead of keeping quality logic inline.

The Home project list includes:

- visible project count
- quality filter dropdown
- sort dropdown
- empty state for filters with no matches

Supported filters:

- all quality tiers
- needs attention
- Product-ready
- Strong beta
- MVP+
- Needs hardening

Supported sorting:

- newest first
- lowest quality first
- highest quality first
- name A-Z

## Why this matters

Quality signals are now navigable. Users can focus on the weakest projects, find the strongest projects, or scan a large workspace alphabetically.

Extracting the logic into a shared utility also prepares the app for reuse in future workspace pages, tables, and reports.

## Next phase options

1. Persist quality filter/sort preferences locally.
2. Add dedicated Workspace Quality page for larger teams.
3. Add trend indicators next to each project.
4. Add onboarding checklist for new users and new workspaces.
