# Phase 34: Workspace Quality Trends

This phase adds local quality snapshots to the Workspace Quality page.

## Implemented

### Snapshot utilities

Added `src/lib/workspaceQualityTrendUtils.js`.

It provides:

- local snapshot storage via `localStorage`
- snapshot creation from the current workspace overview
- snapshot listing
- simple trend summary against the last saved snapshot
- date formatting helper

Snapshots store:

- timestamp
- workspace average score
- project count
- tier distribution
- number of projects needing attention
- strongest project name

### Workspace Quality UI

`src/pages/WorkspaceQuality.jsx` now includes a `Quality trend` panel.

It shows:

- current trend label
- delta since the last saved snapshot
- last saved timestamp and average
- up to three recent snapshots
- `Save snapshot` CTA

## Why this matters

Quality scoring becomes much more useful when users can tell whether the workspace is improving or degrading over time.

This is intentionally local-first and safe. It does not require backend schema changes and can later be migrated to persistent workspace analytics.

## Next phase options

1. Persist workspace quality controls.
2. Add exportable workspace quality reports.
3. Add backend-backed trend history.
4. Add team/workspace settings.
