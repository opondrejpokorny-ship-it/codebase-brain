# Phase 29: Project Card Quality Badges

This phase brings product quality into the everyday project list.

## Implemented

### Quality badge on project cards

`src/components/projects/ProjectCard.jsx` now computes a metadata-only product quality report for each project card.

Each card shows:

- quality score
- quality tier
- next recommended action

The card still links to the project detail page, preserving the existing navigation model.

### Why this matters

Workspace Quality Overview gives a portfolio-level view, but users also need quality signals while scanning the project grid.

This phase makes quality visible in the primary project list so weak projects stand out without requiring the user to open each dashboard.

## Next phase options

1. Add sorting/filtering by quality tier.
2. Add compact quality trend markers.
3. Add quick-open links from cards to the Quality Dashboard.
4. Add workspace onboarding checklist for new users.
