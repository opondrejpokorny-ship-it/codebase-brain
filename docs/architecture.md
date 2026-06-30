# Codebase Brain Architecture

## Phase 1 architecture

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
  └─ buildCodebaseQuestionPrompt()

AI layer
  ├─ Base44 Core.InvokeLLM for summary
  ├─ base44.functions.invoke("codebaseChat") when available
  └─ Core.InvokeLLM fallback for phase 1 chat
```

## Why this is intentionally simple

The long-term inspiration is a real codebase memory engine with structural indexing, graph queries, MCP tools, and agent integration. Phase 1 does not attempt to build that. It only creates the smallest usable product surface to validate the user value.

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

## Future architecture phases

### Phase 2: Public GitHub import

- Fetch public repository tree.
- Skip large/binary/generated files.
- Import only safe text files.
- Keep strict limits to control cost.

### Phase 3: PR impact analysis

- User pastes diff manually first.
- Later GitHub App reads changed files.
- AI returns risk level, affected flows, and suggested tests.

### Phase 4: Code graph lite

- Detect file imports.
- Store simple `CodeRelation` records.
- Show table view first, graph visualization later.

### Phase 5: MCP server

- Expose tools for Codex/Cursor/Claude Code.
- Tools: search_codebase, explain_file, impact_analysis, suggest_tests.

## Design principles

- Do not spend LLM credits during indexing unless necessary.
- Prefer deterministic parsing before LLM calls.
- Keep all answers grounded in stored context.
- Always warn when context is incomplete.
- Do not introduce GitHub App, billing, or teams before MVP value is proven.
