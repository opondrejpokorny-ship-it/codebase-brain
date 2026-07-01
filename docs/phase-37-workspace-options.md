# Phase 37: Workspace Options

This phase adds a local workspace-level options page.

## Implemented

### Options utility

Added `src/lib/workspaceOptionsUtils.js`.

It stores local workspace options in `localStorage`:

- workspace name
- quality target
- review cadence
- notes
- update timestamp

### Workspace Options page

Added `src/pages/WorkspaceOptions.jsx`.

The page lets the user edit and save:

- workspace name
- quality target
- review cadence
- notes

It also supports resetting values back to defaults.

### Routing and discoverability

`src/App.jsx` now routes `/workspace/settings` to the new Workspace Options page.

`src/pages/WorkspaceQuality.jsx` links to Workspace Options from the page header.

## Why this matters

Codebase Brain now has a basic workspace-level configuration surface. This keeps the workflow local-first while preparing the product for richer workspace configuration later.

## Current roadmap completion

The current workspace-quality roadmap is covered:

1. Workspace quality snapshots.
2. Saved Workspace Quality view preferences.
3. Exportable Workspace Quality reports.
4. Workspace options.
