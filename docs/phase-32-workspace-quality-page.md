# Phase 32: Workspace Quality Page

This phase promotes workspace quality from a compact sidebar card into a dedicated portfolio page.

## Implemented

### Dedicated workspace quality page

Added `src/pages/WorkspaceQuality.jsx` at:

`/workspace/quality`

The page shows:

- workspace average quality score
- total project count
- tier distribution
- projects needing attention
- strongest projects
- per-project next action CTA

### Routing

`src/App.jsx` now includes a protected route for `/workspace/quality`.

### Discoverability

`src/components/projects/WorkspaceQualityOverview.jsx` now links to the full Workspace Quality page from the Home sidebar card.

## Why this matters

The sidebar card is useful for a quick glance, but larger workspaces need a dedicated portfolio view.

This is a product-level step because users can now manage quality across projects without opening each project individually.

## Next phase options

1. Add workspace quality table sorting.
2. Add quality trends and snapshots.
3. Add exportable quality reports.
4. Add team-level workspace settings.
