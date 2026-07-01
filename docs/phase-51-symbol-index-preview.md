# Phase 51: Symbol Index Preview

This phase extends symbol extraction with a preview helper.

## Implemented

- `buildSymbolIndexPreview(files)` in `src/lib/symbolExtractionUtils.js`

The preview returns:

- symbol record count
- counts by symbol kind
- top files by symbol count
- sample symbol records

## Why this matters

The app already extracts symbols in memory. The preview helper is a bridge toward storing a symbol index and making search, explain, and impact workflows faster and more precise.
