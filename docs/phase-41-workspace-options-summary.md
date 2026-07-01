# Phase 41: Workspace Options Summary

This phase makes workspace options visible from the Home dashboard.

## Implemented

### Workspace Options Summary card

Added `src/components/projects/WorkspaceOptionsSummary.jsx`.

The card shows:

- workspace name
- quality target
- review cadence
- optional notes preview
- link to `/workspace/settings`

### Home integration

`src/pages/Home.jsx` now renders the summary card in the sidebar above onboarding and workspace quality.

## Why this matters

Workspace Options previously existed as a route and from Workspace Quality, but users landing on Home had no quick reminder of the current workspace-level target and cadence.

The Home dashboard now surfaces those settings as part of the everyday product workflow.
