# Codebase Brain next 10 phases

This roadmap continues after the PR Inbox, Context Pack, Graph Snapshot, Decision Memory, and MCP Lite groundwork.

## Product direction

Codebase Brain should become a practical PR Review Cockpit and codebase memory layer. The near-term goal is not to automate GitHub writes, but to make internal review, context packaging, graph evidence, and project memory reliable enough for daily use.

## Safety principles

- Keep GitHub write actions disabled by default.
- Keep every PR review workflow human-in-the-loop.
- Keep optional Base44 entity persistence behind local-safe fallback helpers.
- Prefer small, observable UI changes over large rewrites.
- Preserve export-only behavior when persistence is unavailable.

## First 10 implementation phases

1. **Roadmap refresh** — keep this plan in the repository as the current execution contract.
2. **PR Inbox display helpers** — move repeated label/title/status helpers into a shared utility.
3. **Context Snapshot save feedback** — show persisted/fallback/error source after saving a context pack.
4. **PR queue source metadata** — annotate queued PR items with source and persistence hints.
5. **Graph stable keys** — create deterministic relation/symbol keys as a prerequisite for future upsert.
6. **Webhook sample payloads** — add realistic PR event examples for manual normalizer testing.
7. **MCP response evidence schema** — define required evidence fields for read-only tool responses.
8. **Decision persistence feedback** — make Decision Memory save source observable without breaking local-first behavior.
9. **Risk memory cross-link contract** — prepare how PR Inbox will surface similar past risks.
10. **Chrome QA smoke checklist** — define the practical browser flows that must pass after each implementation batch.

## Definition of done for this batch

- Every phase lands as a small PR.
- CI passes before merge.
- `main` remains deployable after each step.
- Any unfinished feature is explicitly described as a guarded contract or helper, not presented as complete UI automation.
