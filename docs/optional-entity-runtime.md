# Optional entity runtime helper

Codebase Brain must keep working before optional Base44 entities exist. The optional entity runtime helper centralizes feature detection and safe best-effort reads/writes.

## Added helper

`src/lib/optionalEntityRuntime.js` exposes:

- `optionalEntity(entityName)`
- `canReadEntity(entityName)`
- `canWriteEntity(entityName)`
- `entitySourceLabel({ remoteCount, localCount })`
- `safeFilterEntity(entityName, filters, sort, limit)`
- `safeCreateEntity(entityName, record)`

## Compatibility

`src/lib/impactAnalysisRuntimeUtils.js` re-exports `optionalEntity` so existing imports keep working.

## Safety

- Missing entities return empty safe results, not page-breaking exceptions.
- Persistence errors are returned as structured errors.
- Local-first features can keep their fallback behavior.
- No GitHub write behavior changes.
- No private token behavior changes.
