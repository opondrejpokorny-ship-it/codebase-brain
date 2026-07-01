# Phase 30: Quality List Controls

This phase makes the Home project list easier to manage as a real product workspace grows.

## Implemented

### Project quality list utilities

Added `src/lib/projectQualityListUtils.js` with:

- project quality decoration
- quality filters
- quality sorting
- visible project list calculation

Supported filters:

- all projects
- needs attention
- Product-ready
- Strong beta
- MVP+

Supported sorting:

- newest first
- lowest quality first
- highest quality first
- name A-Z

### Home quality controls

`src/pages/Home.jsx` now includes a quality control toolbar above the project grid.

It shows:

- visible project count
- filter dropdown
- sort dropdown
- empty-state when no project matches the selected quality filter

## Why this matters

After adding workspace quality and card-level badges, the next product step is navigability.

Users can now quickly answer:

- Which project needs attention first?
- Which project is closest to product-ready?
- How many projects match this quality tier?
- Can I scan my workspace alphabetically?

## Next phase options

1. Persist list control preferences locally.
2. Add quality trend markers.
3. Add quick-open quality links on project cards.
4. Add workspace onboarding checklist.
