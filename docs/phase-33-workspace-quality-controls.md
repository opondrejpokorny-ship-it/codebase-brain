# Phase 33: Workspace Quality Controls

This phase turns the dedicated Workspace Quality page into a portfolio management view.

## Implemented

### Workspace quality list utility

Added `src/lib/workspaceQualityListUtils.js` with reusable helpers for:

- workspace quality filters
- workspace quality sorting
- tier key normalization
- applying filter and sort controls to project reports

Supported filters:

- all projects
- needs attention
- Product-ready
- Strong beta
- MVP+
- Needs hardening

Supported sorting:

- lowest quality first
- highest quality first
- name A-Z
- name Z-A

### Workspace Quality page controls

`src/pages/WorkspaceQuality.jsx` now includes an `All projects` section with:

- visible project count
- quality filter
- sort selector
- full project list
- empty state for filters with no matches

The existing top-level summary remains intact:

- average workspace score
- tier distribution
- projects needing attention
- strongest projects

## Why this matters

A larger workspace needs more than a summary. Users need to find weak projects, scan strongest projects, and manage a portfolio of codebases from one place.

This phase makes `/workspace/quality` the first real portfolio-management screen in Codebase Brain.

## Next phase options

1. Add trend snapshots for workspace quality.
2. Add local persistence for workspace quality controls.
3. Add exportable quality reports.
4. Add team/workspace settings.
