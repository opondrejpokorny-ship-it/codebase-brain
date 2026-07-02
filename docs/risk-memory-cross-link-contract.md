# Risk Memory cross-link contract

PR Inbox should eventually show similar past risks for every analyzed PR item.

## Query inputs

Use the PR item to build a local query from:

- changed files
- relevant files
- related files
- verdict or risk level
- repository/PR label

## UI behavior

First UI version should show a guarded placeholder such as:

> Similar past risks will appear after more analyzed history is available.

When enough history exists, show the top matches with:

- matching file path
- previous verdict
- risk signal summary
- link back to Risk Memory detail

## Safety

This feature is read-only. It must never mutate GitHub state or auto-comment on a PR.
