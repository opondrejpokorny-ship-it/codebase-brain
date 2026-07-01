# Phase 34: Workspace Quality Snapshots

This phase adds lightweight local quality snapshots to the Workspace Quality page.

## Implemented

### Snapshot utility

`src/lib/workspaceQualityTrendUtils.js` stores lightweight workspace quality snapshots in `localStorage`.

It supports:

- building a snapshot from the current workspace quality overview
- saving snapshots locally
- listing recent snapshots
- clearing snapshots
- summarizing the current score against the latest saved snapshot
- formatting snapshot dates

Snapshots include:

- timestamp
- workspace average quality
- total project count
- tier distribution
- number of projects needing attention
- strongest project name

### Workspace Quality UI

`src/pages/WorkspaceQuality.jsx` includes a `Quality trend` card.

It shows:

- current direction compared with the latest saved snapshot
- last saved snapshot date and score
- recent snapshots
- a `Save snapshot` action

## Why this matters

Workspace quality is no longer only a current-state dashboard. Users can now save local milestones and see whether their workspace quality is improving or getting worse over time.

This is intentionally local-first and does not require a backend schema change yet.

## Next phase options

1. Persist Workspace Quality controls.
2. Add exportable quality reports.
3. Promote snapshots to a backend entity later.
4. Add workspace/team settings.
