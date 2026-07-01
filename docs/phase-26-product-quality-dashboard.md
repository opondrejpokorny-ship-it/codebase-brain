# Phase 26: Product Quality Dashboard

This phase starts the move from MVP screens toward a more complete product experience.

## Implemented

### Product quality scoring

Added `src/lib/productQualityUtils.js` with a product-facing quality report:

- import coverage
- context completeness
- review readiness
- rules maturity
- overall score
- product tier
- productization priorities

The report intentionally uses deterministic local project data instead of another AI call.

### Project Quality Dashboard

Added `src/pages/ProductQualityDashboard.jsx` at:

`/project/:id/quality`

The dashboard shows:

- overall product quality score
- tier such as `Product-ready`, `Strong beta`, `MVP+`, or `Needs hardening`
- four quality score cards
- productization priorities
- project facts
- links into context queue, PR Inbox, project rules, and architecture

### Navigation

Added a `Quality` button to the project detail header so the quality cockpit is a first-class project page.

## Why this matters

Codebase Brain now has a product-level view that answers:

- Is this project actually indexed well enough?
- Is the context complete enough for grounded answers?
- Is PR review memory mature enough?
- Are rules and ADR memory present?
- What should the user fix next?

This is a better foundation for a full product than exposing isolated MVP tools without a maturity model.

## Next phase options

1. Turn priorities into actionable one-click tasks.
2. Add repository import depth controls.
3. Add stronger symbol / graph quality metrics.
4. Add team-ready project settings and workspace-level quality overview.
