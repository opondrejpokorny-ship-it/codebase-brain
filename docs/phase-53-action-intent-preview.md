# Phase 53: Action Intent Preview

This phase adds a neutral preview-only action intent utility.

## Implemented

- `src/lib/actionIntentUtils.js`

The utility creates disabled intent objects with:

- label
- target
- body
- reason
- mode
- enabled flag
- timestamp

It also includes a helper for building an intent from a review packet.

## Why this matters

Future external actions need a safe preview object before any live execution exists. This keeps current workflows controlled while preparing a structured path for later integrations.
