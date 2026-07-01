# Phase 43: Navigation Map

This phase adds a small central navigation map for workspace and project screens.

## Implemented

- `src/lib/navigationMapUtils.js`
- Product Health navigation audit section

The utility provides:

- workspace route constants
- project route suffix constants
- project route builder
- workspace route builder
- route audit rows for the Product Health page

## Why this matters

As the app grows, scattered hard-coded links become harder to maintain. A shared navigation map gives future phases a safer place to build links and audit available product screens.
