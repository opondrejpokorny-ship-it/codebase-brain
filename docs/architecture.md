# Codebase Brain Architecture

## Current lightweight architecture

```txt
Base44 frontend
  ├─ Dashboard
  ├─ Add Repository
  └─ Project Detail + Chat

Base44 entities
  ├─ CodebaseProject
  ├─ CodeFile
  └─ CodebaseChatMessage

Client utilities
  ├─ parsePastedCode()
  ├─ detectLanguageFromPath()
  ├─ detectStackFromFiles()
  ├─ createFallbackSummary()
  ├─ buildCodebaseQuestionPrompt()
  └─ client fallback importPublicGithubRepository()

Base44 backend functions
  └─ importPublicGithubRepository

Public GitHub import
  ├─ frontend tries backend function first
  ├─ browser/client fallback keeps MVP usable before deploy
  ├─ parse GitHub URL
  ├─ fetch public repo metadata
  ├─ fetch recursive default-branch tree
  ├─ select safe text file candidates
  ├─ download raw file content
  └─ frontend stores CodeFile records

AI layer
  ├─ Base44 Core.InvokeLLM for summary
  ├─ base44.functions.invoke("codebaseChat") when available
  └─ Core.InvokeLLM fallback for phase 1 chat
```

## Why this is intentionally simple

The long-term inspiration is a real codebase memory engine with structural indexing, graph queries, MCP tools, and agent integration. The current version does not attempt to build that yet. It only creates the smallest usable product surface to validate whether users get value from asking questions about stored codebase context.

## Import flow

```txt
User enters public GitHub URL
  ↓
AddRepository
  ↓
base44.functions.invoke("importPublicGithubRepository")
  ↓ if backend unavailable
client import fallback
  ↓
GitHub public API: repo metadata + recursive tree
  ↓
Filter safe files by path, extension, size, and priority
  ↓
Fetch raw file content from raw.githubusercontent.com
  ↓
Create CodebaseProject
  ↓
Create CodeFile records
  ↓
Generate lightweight summary
```

## Current context flow

```txt
User question
  ↓
ChatBox
  ↓
Load CodebaseProject + CodeFile records
  ↓
Select a small set of relevant files
  ↓
Build grounded prompt
  ↓
Invoke Base44 LLM integration
  ↓
Store assistant message
```

## Current safety and cost controls

- Public import only.
- No private GitHub permissions.
- No GitHub App yet.
- Max 40 files.
- Max 35 KB per file.
- Max 3,000 tree entries inspected.
- Generated/dependency/build folders skipped.
- Lock files skipped.
- Real `.env` files skipped, except safe examples/templates.
- Binary/media files skipped.
- Only one lightweight LLM summary call on project creation.
- Chat sends only selected relevant files, not the whole project.

## Future architecture phases

### Phase 3: Import result panel and backend hardening

- Show imported count, skipped count, default branch, source backend/client, and file errors.
- Add better rate-limit messaging.
- Add optional GitHub token through server secrets.
- Save import progress if Base44 supports long-running status updates.

### Phase 4: PR impact analysis

- User pastes diff manually first.
- Later GitHub App reads changed files.
- AI returns risk level, affected flows, and suggested tests.

### Phase 5: Code graph lite

- Detect file imports.
- Store simple `CodeRelation` records.
- Show table view first, graph visualization later.

### Phase 6: MCP server

- Expose tools for Codex/Cursor/Claude Code.
- Tools: search_codebase, explain_file, impact_analysis, suggest_tests.

## Design principles

- Do not spend LLM credits during indexing unless necessary.
- Prefer deterministic parsing before LLM calls.
- Keep all answers grounded in stored context.
- Always warn when context is incomplete.
- Do not introduce GitHub App, billing, or teams before MVP value is proven.
