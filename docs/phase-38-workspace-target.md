# Phase 38: Workspace Quality Target

This phase connects the Workspace Options quality target to the Workspace Quality page.

## Implemented

### Target utility

Added `src/lib/workspaceTargetUtils.js`.

It provides:

- quality target normalization
- current average vs target comparison
- target met / below target status
- readable delta label

### Workspace Quality UI

`src/pages/WorkspaceQuality.jsx` now reads Workspace Options and shows:

- configured target percentage
- whether current workspace quality meets the target
- target badge in the page header
- target badge in the Quality trend card

### Report export

`src/lib/workspaceQualityReportUtils.js` now includes workspace options and target status in the Markdown export.

The report now includes:

- workspace name
- workspace average
- quality target
- target status

## Why this matters

The quality target was previously stored but not visible in the main product workflow.

Now Workspace Quality can answer: are we above or below the quality bar we set for this workspace?
