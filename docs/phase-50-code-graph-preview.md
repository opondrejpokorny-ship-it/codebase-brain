# Phase 50: Code Graph Preview

This phase extends the existing graph utility with a storage preview summary.

## Implemented

- `buildCodeGraphStoragePreview(files)` in `src/lib/codeGraphUtils.js`

The preview returns:

- relation record count
- internal record count
- external record count
- unresolved record count
- top connected files
- sample relation records

## Why this matters

The app already builds relations in memory. The new preview is a bridge toward storing graph records and showing users what would be saved before introducing heavier persistence.
