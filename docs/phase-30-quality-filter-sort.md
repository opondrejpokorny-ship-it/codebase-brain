# Phase 30: Quality Filter and Sorting

This phase makes the Home project grid behave like a product worklist.

## Implemented

### Quality filters

The Home project list can now filter by:

- all quality tiers
- needs action
- Product-ready
- Strong beta
- MVP+
- Needs hardening

### Sorting

The project list can now sort by:

- newest first
- lowest quality first
- highest quality first
- name A-Z

### Empty filter state

If no projects match the selected filter, Home shows a clear empty state with a reset action.

## Why this matters

Once the product has workspace-level quality signals and quality badges, users need a way to operate on those signals.

This phase turns the project grid into a prioritization surface: a user can immediately find weak projects, high-quality projects, or the newest repositories.

## Next phase options

1. Add onboarding checklist for first-time workspace setup.
2. Persist filter/sort preference locally.
3. Add quality trend history.
4. Add bulk actions for selected projects.
