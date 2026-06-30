# Phase 6: Public GitHub PR Fetch

Phase 6 makes impact analysis easier to use by allowing the user to paste a public GitHub pull request URL and automatically load its diff.

This is still intentionally lightweight:

- public PRs only,
- no GitHub App,
- no private repo permissions,
- no PR comments,
- no status checks or CI logs,
- no writes to GitHub.

## What changed

### New backend function

```txt
base44/functions/fetchPublicGithubPrDiff/entry.ts
```

It accepts:

```json
{
  "pr_url": "https://github.com/owner/repo/pull/123"
}
```

It returns:

```json
{
  "repositoryFullName": "owner/repo",
  "prNumber": 123,
  "title": "PR title",
  "state": "open",
  "baseRef": "main",
  "headRef": "feature-branch",
  "changedFiles": [],
  "changedFilesCount": 3,
  "additions": 120,
  "deletions": 30,
  "diff": "diff --git ...",
  "truncated": false,
  "source": "base44_backend_function"
}
```

### New frontend helper

```txt
src/lib/githubPrUtils.js
```

It provides:

- `parseGithubPullRequestUrl(url)`
- `fetchPublicGithubPrDiffClient(prUrl)`
- `formatPrDiffForImpactAnalysis(prResult)`

### Updated impact analysis page

```txt
src/pages/ImpactAnalysis.jsx
```

The page now has:

- public GitHub PR URL input,
- **Fetch PR diff** button,
- backend-first PR fetch,
- client fallback if backend function is unavailable,
- PR metadata preview,
- automatic diff insertion into the existing analysis textarea.

## Limits

Current limits:

- max 90,000 diff characters,
- max 100 changed files from the GitHub files API,
- public GitHub PRs only.

If the diff is too long, it is truncated and the prompt includes a warning.

## Why this matters

Before this phase, users had to manually copy/paste diffs. Now they can paste a public PR URL and immediately run impact analysis against the imported codebase sample.

This creates a realistic workflow before building full GitHub App integration.

## Still intentionally excluded

- private PR access,
- GitHub App installation,
- automatic PR comments,
- CI/check inspection,
- review thread handling,
- code patching,
- merge decisions.

## Next recommended phase

Phase 7 should be one of:

1. **Project compatibility warning**: compare the PR repository with the imported project repository and warn when they differ.
2. **Public PR metadata summary**: show changed files, additions/deletions, title, base/head branches before analysis.
3. **GitHub App planning docs**: prepare permissions and webhook contract before implementing private repo access.

Recommended next step: project compatibility warning, because it prevents users from accidentally analyzing a PR from a different repository than the stored codebase sample.
