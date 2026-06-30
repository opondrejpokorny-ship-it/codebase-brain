# Phase 7: Repository Compatibility Warning

Phase 7 adds a safety check for public PR impact analysis.

When the user fetches a public GitHub PR diff, the app compares the PR repository with the repository stored on the current Codebase Project. This helps prevent misleading analysis when a user accidentally analyzes a PR from a different repository than the imported codebase sample.

## What changed

### New utility

```txt
src/lib/repositoryCompatibilityUtils.js
```

It provides:

- `normalizeRepositoryFullName(value)`
- `repositoryFullNameFromUrl(url)`
- `projectRepositoryFullName(project)`
- `compareProjectAndPrRepository(project, prMeta)`

### Updated Impact Analysis page

```txt
src/pages/ImpactAnalysis.jsx
```

After PR fetch, the page now displays:

- `match` when the project repository and PR repository are the same,
- `mismatch` when they differ,
- `unknown` when comparison cannot be verified.

The comparison result is also saved into optional `CodebaseAnalysis.repository_compatibility` when analysis history is available.

## Compatibility sources

Project repository is derived from:

1. `CodebaseProject.import_metadata.repositoryFullName`, if available,
2. otherwise `CodebaseProject.repository_url`.

PR repository is derived from:

1. fetched PR metadata `repositoryFullName`.

## Why this matters

Impact analysis is only as good as the stored codebase context. If a user imports one repository but analyzes a PR from another repository, Codebase Brain may select irrelevant files and produce misleading conclusions.

This warning keeps the MVP safe without blocking power users who intentionally analyze related repositories.

## Current behavior

- `match`: green compatibility card.
- `mismatch`: red warning card and warning toast after fetch.
- `unknown`: amber warning card.

The user can still run analysis. We warn but do not block.

## Still intentionally excluded

- hard blocking mismatched PRs,
- organization-level repository mapping,
- fork/upstream awareness,
- monorepo package matching,
- private repository verification.

## Next recommended phase

Phase 8 should prepare for GitHub App integration by documenting:

- required permissions,
- webhook events,
- PR analysis flow,
- data we store,
- what we never write automatically.

This keeps the implementation legally and operationally clean before adding private repo access or PR comments.
