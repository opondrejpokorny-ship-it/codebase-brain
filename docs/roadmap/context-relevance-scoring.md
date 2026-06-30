# Context relevance scoring roadmap

Codebase Brain should explain not only which files were selected, but why those files matter.

## Current status

A shared scoring helper exists at:

```txt
src/lib/contextRelevanceScoring.js
```

It defines:

```txt
- minimal / balanced / deep presets
- important path patterns
- low value path patterns
- query word extraction
- relation-aware scoring
- per-file score + reasons
```

## Adoption steps

1. Replace the local scoring logic in `src/lib/contextPackBuilder.js` with `scoreContextFiles`.
2. Add `relevanceScores` to the returned Context Pack.
3. Show score badges in `ContextPackInspector` next to each selected file.
4. Add a `Context depth` selector to Impact Analysis:

```txt
Minimal   6k tokens
Balanced 12k tokens
Deep      24k tokens
```

5. Include relevance scores in `formatContextPackForPrompt`.
6. Use the score later for PR comments and risk explanations.

## Product reason

This supports the main product promise:

```txt
Do not send the whole codebase to AI.
Send only the context that matters, with an explanation.
```
