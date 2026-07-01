# Phase 27: Actionable Quality Priorities

This phase turns the Product Quality Dashboard from a passive report into an action cockpit.

## Implemented

### Priority action mapping

Added `src/lib/productQualityActionUtils.js`.

Each productization priority can now resolve to:

- CTA label
- target route
- expected product impact
- effort level

Examples:

- `resolve_missing_context` -> Import Queue
- `add_project_rules` -> Project Rules
- `run_impact_analysis` -> Impact Analysis
- `next_product_layer` -> Architecture

### Next best action

The dashboard now highlights the highest-ranked priority as the `Next best action` at the top of the page.

It shows:

- title
- explanation
- severity
- effort
- expected impact
- primary CTA

### Actionable priority list

The old passive priority list is now an actionable task list. Each priority includes:

- step number
- severity
- effort
- expected impact
- route button

## Why this matters

A product-grade dashboard should not only say what is wrong. It should move the user toward the next best action.

This phase makes the quality dashboard usable as a recurring product workflow:

1. inspect quality
2. pick the next best action
3. jump to the relevant workspace
4. return and see quality improve

## Next phase options

1. Add quality trend history.
2. Add workspace-wide quality overview across all projects.
3. Add richer graph quality metrics.
4. Add import depth controls directly from the quality cockpit.
