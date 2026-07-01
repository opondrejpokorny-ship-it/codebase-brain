# Page refactor plan

Some pages have grown large during fast iteration. Future changes should split them into smaller pieces before adding more behavior.

## Goals

- Keep current user workflows unchanged.
- Move data loading into small hooks.
- Move repeated cards into small components.
- Keep fallback behavior intact.
- Add visual improvements only after the data layer is easier to test.

## Suggested order

1. Extract a small data hook.
2. Move record merging into the hook.
3. Extract item card components.
4. Add badges and controls inside the smaller cards.
5. Keep each pull request focused on one file or one component.

## Safety

- Avoid large full-page rewrites.
- Preserve existing fallback behavior.
- Keep manual review as the default workflow.
- Let CI validate every small step.
