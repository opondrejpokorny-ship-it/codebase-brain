# Phase 40: Copy Workspace Quality Report

This phase adds a clipboard action for Workspace Quality reports.

## Implemented

### Report utility

`src/lib/workspaceQualityReportUtils.js` now exports `copyWorkspaceQualityMarkdownReport`.

It builds the same Markdown report used by the download action and writes it to the browser clipboard when available.

### Workspace Quality UI

`src/pages/WorkspaceQuality.jsx` now includes a `Copy report` button in the Quality trend card.

The UI shows:

- success message when the report is copied
- fallback message when clipboard access is unavailable
- existing `Download report` remains available

## Why this matters

Markdown download is useful, but many users will want to paste a quick quality report into Slack, GitHub, Linear, Notion, or an internal document.

This makes Workspace Quality easier to share without creating a file every time.
