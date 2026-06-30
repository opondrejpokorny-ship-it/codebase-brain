# Phase 16: Private Import Readiness Card

Phase 16 adds a project-level readiness signal for future private repository import.

This phase does not import private files and does not create GitHub installation access tokens.

## New component

```txt
src/components/projects/PrivateImportReadinessCard.jsx
```

The component checks whether:

- the project has a GitHub repository URL,
- the project is `url_only`,
- an active `GitHubRepositoryLink` is linked to the project,
- or an active repository link matches the project repository URL.

## New wrapper page

```txt
src/pages/ProjectDetailWithReadiness.jsx
```

The wrapper loads the project and linked repository metadata, renders `PrivateImportReadinessCard`, and then renders the existing `ProjectDetail` page.

This avoids a risky large rewrite of `ProjectDetail.jsx`.

## Route update

```txt
/project/:id
```

now renders:

```txt
ProjectDetailWithReadiness
```

instead of rendering `ProjectDetail` directly.

## UI states

### Ready for future import

Shown when:

```txt
project.status = url_only
active GitHubRepositoryLink is linked to project
```

The card explains that private file import can be added after installation-token support is implemented.

### Not ready yet

Shown when:

```txt
project.status = url_only
no active GitHubRepositoryLink is linked
```

The card links to:

```txt
/github/repositories
/diagnostics
```

## Safety

The card is informational only.

It does not:

- call GitHub,
- create tokens,
- import files,
- run AI analysis,
- write PR comments/checks/statuses.

## Next recommended phase

Add a disabled-by-default installation access token helper skeleton.

The helper should:

- require a feature flag,
- validate that private import is disabled by default,
- never expose token values to the frontend,
- support diagnostics-only response first.
