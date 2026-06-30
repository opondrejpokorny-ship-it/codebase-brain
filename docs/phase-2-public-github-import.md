# Phase 2: Lightweight Public GitHub Import

Phase 2 adds a deliberately limited import flow for public GitHub repositories.

The goal is not to clone or deeply index a whole repository. The goal is to quickly create enough stored context for Codebase Brain to answer basic questions without a GitHub App, token, backend worker, or expensive indexing pipeline.

## What it does

When the user enters a GitHub repository URL and leaves the import checkbox enabled, the app:

1. parses the `https://github.com/owner/repo` URL,
2. calls GitHub's public repository metadata endpoint,
3. reads the default branch,
4. fetches the recursive tree,
5. selects a small set of likely useful text files,
6. downloads raw file content,
7. stores the files as `CodeFile` records,
8. detects stack from imported files,
9. generates a lightweight summary.

## Limits

Current client-side limits are defined in `src/lib/githubImport.js`:

- max 40 files,
- max 35 KB per file,
- max 3,000 tree entries inspected,
- generated/build/dependency folders skipped,
- lock files skipped,
- binary/image/media files skipped.

## Prioritized files

The import prioritizes:

- README,
- `package.json`,
- `src/`,
- `app/`,
- `pages/`,
- `components/`,
- `api/`,
- `functions/`,
- `server/`,
- `lib/`,
- `prisma/`,
- `docs/`,
- config files.

## Intentionally excluded

- private repositories,
- GitHub App authentication,
- token-based import,
- full clone,
- backend queue,
- large files,
- binary files,
- vector embeddings,
- tree-sitter/LSP indexing.

## Known limitations

- It depends on unauthenticated GitHub API limits.
- Some public repositories may be blocked by rate limits or CORS behavior.
- Branch names with unusual characters may need hardening later.
- It is a client-side MVP flow, not a production ingestion pipeline.
- It does not preserve directory ordering beyond the priority heuristic.

## Next hardening step

Move import into a Base44 backend function:

```txt
importPublicGithubRepo(project_id, repository_url)
```

That backend function can:

- use a GitHub token safely,
- avoid browser CORS issues,
- handle rate limits better,
- save files progressively,
- report import progress,
- enforce organization-level limits.
