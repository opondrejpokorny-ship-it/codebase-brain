# Phase 31: Workspace Onboarding Checklist

This phase adds a product onboarding layer to the Home dashboard.

## Implemented

### Workspace onboarding utility

Added `src/lib/workspaceOnboardingUtils.js`.

It builds a checklist from workspace project metadata:

- add first repository
- store usable code context
- review workspace quality
- act on weakest project
- run an analysis workflow

The utility returns completed count, total count, progress percent, and actionable step metadata.

### Workspace onboarding component

Added `src/components/projects/WorkspaceOnboardingChecklist.jsx`.

The component shows:

- progress percentage
- progress bar
- completed / pending steps
- CTA buttons for unfinished steps
- completion success state

### Home integration

`src/pages/Home.jsx` now renders Workspace Onboarding Checklist above Workspace Quality Overview.

## Why this matters

A full product should guide first-time and returning users through setup, not assume they know the ideal sequence.

This checklist turns the dashboard into a product onboarding surface:

1. create a project
2. import context
3. inspect quality
4. act on the weakest project
5. run analysis workflows

## Next phase options

1. Persist Home filter/sort preferences locally.
2. Add dismissible onboarding steps.
3. Add quality trend history.
4. Add team/workspace settings.
