# Phase 25: Guarded Readiness Preview

This phase adds a safe readiness layer after local comment approval.

## Implemented

### Readiness utility

`src/lib/readinessPreviewUtils.js` builds simple readiness rows and summarizes blockers.

Checks currently include:

- approved draft exists
- pull request metadata is available
- repository match is acceptable
- final step availability

The final step is intentionally marked unavailable in this phase.

### PR Inbox UI

Analyzed PR Inbox items now include a `Readiness preview` action. The panel shows:

- readiness checklist
- pass / blocked state per check
- blocker count
- disabled preview-only button

## Safety boundaries

- The panel is informational only.
- It cannot perform the final step.
- It does not add any new integration endpoint.
- It does not change external services.
- Approval remains local state only.

## Why this matters

This keeps the workflow staged:

1. internal analysis
2. editable draft
3. local approval
4. readiness preview
5. future explicit final step, still not implemented here

The app now has a clear place to show prerequisites before any later controlled release of final-step functionality.
