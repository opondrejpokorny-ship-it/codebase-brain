# Phase 28: Workspace Quality Overview

This phase moves product quality from a single-project cockpit to the workspace level.

## Implemented

### Metadata-aware project scoring

`src/lib/productQualityUtils.js` now supports metadata-only scoring. This lets the workspace dashboard estimate quality without loading every file for every project.

Improvements:

- uses `import_metadata.file_count` / `fileCount` when available
- treats import metadata as stored context
- avoids incorrectly scoring metadata-only project summaries as empty

### Workspace aggregation

Added `src/lib/workspaceQualityUtils.js`.

It builds:

- workspace average quality score
- tier distribution
- projects needing attention
- strongest projects
- per-project next action

### Workspace Quality Overview component

Added `src/components/projects/WorkspaceQualityOverview.jsx`.

It shows on the Home sidebar:

- average workspace quality
- Product-ready / Strong beta / MVP+ / Needs hardening counts
- projects needing action
- next action CTA per listed project

### Home dashboard integration

`src/pages/Home.jsx` now renders Workspace Quality Overview above the roadmap when projects exist.

## Why this matters

A full product should help the user manage a portfolio of codebases, not only one project at a time.

This phase gives the user an immediate answer after opening the app:

- How healthy is my workspace?
- Which projects need attention first?
- What is the next action for each weak project?

## Next phase options

1. Add workspace quality trend history.
2. Add filters and sorting for larger workspaces.
3. Add quality badges directly to project cards.
4. Add team/workspace settings for product-grade onboarding.
