# Phase 3: Import Observability

Phase 3 adds a small audit trail for public GitHub imports.

The goal is to make repository import behavior visible without building a heavy job system, worker queue, or full ingestion dashboard.

## What changed

### 1. Import metadata is stored on CodebaseProject

New optional field:

```txt
CodebaseProject.import_metadata
```

The frontend writes this after public import:

```json
{
  "source": "base44_backend_function",
  "repositoryFullName": "owner/repo",
  "defaultBranch": "main",
  "importedFilesCount": 40,
  "finalFilesCount": 40,
  "attemptedFiles": 40,
  "skippedFiles": 120,
  "truncatedTree": false,
  "errors": [],
  "backendError": null,
  "limits": {
    "maxFiles": 40,
    "maxFileBytes": 35000,
    "maxTreeEntries": 3000
  },
  "importedAt": "2026-06-30T00:00:00.000Z"
}
```

### 2. Project detail displays import status

New component:

```txt
src/components/projects/ImportMetadataCard.jsx
```

It shows:

- backend vs client fallback source,
- imported files,
- attempted files,
- skipped files,
- default branch,
- repository full name,
- backend fallback reason,
- truncated tree warning,
- per-file import warnings.

## Why this matters

Without this card, users see only the final file list. They cannot tell whether:

- import used backend or browser fallback,
- GitHub tree was truncated,
- some files failed,
- the file list is only a partial sample,
- rate limits or backend deployment issues affected the result.

## Still intentionally excluded

- long-running import jobs,
- progress streaming,
- retries,
- import history table,
- GitHub App,
- private repo access,
- full repository clone.

## Next recommended phase

Phase 4 should be **manual PR / diff impact analysis**:

- user opens a project,
- pastes changed files or a diff,
- AI analyzes impact against stored codebase context,
- result includes risk level, affected files/flows, suggested tests, and merge questions.

This gives clear developer value before we build a real GitHub App.
