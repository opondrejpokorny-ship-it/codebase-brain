# Phase 2: Lightweight Public GitHub Import

Phase 2 adds a deliberately limited import flow for public GitHub repositories.

The goal is not to clone or deeply index a whole repository. The goal is to quickly create enough stored context for Codebase Brain to answer basic questions without a GitHub App, private token flow, backend worker queue, or expensive indexing pipeline.

## What it does

When the user enters a GitHub repository URL and leaves the import checkbox enabled, the app:

1. parses the `https://github.com/owner/repo` URL,
2. tries the Base44 backend function `importPublicGithubRepository`,
3. falls back to browser/client import if the backend function is not deployed yet,
4. calls GitHub's public repository metadata endpoint,
5. reads the default branch,
6. fetches the recursive tree,
7. selects a small set of likely useful text files,
8. downloads raw file content,
9. stores the files as `CodeFile` records,
10. detects stack from imported files,
11. generates a lightweight summary.

## Files

Frontend helper:

```txt
src/lib/githubImport.js
```

Base44 backend function:

```txt
base44/functions/importPublicGithubRepository/entry.ts
```

Frontend call site:

```txt
src/pages/AddRepository.jsx
```

## Limits

Current limits are mirrored in the frontend helper and backend function:

- max 40 files,
- max 35 KB per file,
- max 3,000 tree entries inspected,
- generated/build/dependency folders skipped,
- lock files skipped,
- real `.env` files skipped,
- binary/image/media files skipped.

## Prioritized files

The import prioritizes:

- README,
- `package.json`,
- `base44/`,
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
- full clone,
- backend queue,
- large files,
- binary files,
- real environment files,
- vector embeddings,
- tree-sitter/LSP indexing.

## Why backend-first

The backend function can later:

- use a GitHub token safely,
- avoid browser CORS issues,
- handle rate limits better,
- save files progressively,
- report import progress,
- enforce organization-level limits.

For now it returns the selected file list to the frontend, and the frontend saves `CodeFile` records. This keeps the feature small and easy to debug.

## Known limitations

- It still imports only public repositories.
- It does not preserve full repository structure beyond selected files.
- It does not create file summaries per file yet.
- It does not build a code graph yet.
- It may need Base44 publish/deploy before the backend function is available in preview.

## Next hardening step

Add a manual import result panel to show:

- source: backend vs client fallback,
- imported count,
- skipped count,
- errors per file,
- default branch,
- whether the GitHub tree was truncated.
