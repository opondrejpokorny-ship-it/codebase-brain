# Phase 36: Workspace Quality Export

This phase adds a local Markdown export for Workspace Quality reports.

## Implemented

### Report utility

Added `src/lib/workspaceQualityReportUtils.js`.

It can build a Markdown report containing:

- generated timestamp
- workspace average score
- total project count
- projects needing attention
- tier distribution
- projects needing attention table
- strongest projects table
- recent snapshot table

It also provides a browser download helper using a local Blob.

### Workspace Quality integration

`src/pages/WorkspaceQuality.jsx` now has a `Download report` button in the Quality trend card.

The export is local-first:

- no backend call
- no new schema
- no external service
- generated from current in-memory overview and local snapshots

## Why this matters

A product-grade dashboard should let users take information out of the app.

Markdown export makes it easy to share a workspace quality summary in Slack, GitHub issues, internal docs, or investor/product updates.

## Next phase options

1. Add workspace/team settings.
2. Add CSV export.
3. Add scheduled or backend report snapshots later.
4. Add copy-to-clipboard report action.
