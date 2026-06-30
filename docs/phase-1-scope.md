# Phase 1 Scope

Phase 1 is a deliberately small Base44 MVP foundation. The goal is to validate the product idea without spending credits on heavy indexing, GitHub automation, MCP, or graph infrastructure.

## User flow

1. User opens the dashboard.
2. User creates a Codebase Project.
3. User provides a GitHub URL and/or pastes a small code sample.
4. The app stores the project and parsed file records.
5. The app detects a rough technology stack from filenames and content.
6. The app creates a short project summary.
7. User asks questions in the project chat.
8. The app answers only from stored project/file context and warns when context is incomplete.

## Current entities

### CodebaseProject

- `name`
- `repository_url`
- `description`
- `status`: `draft`, `indexed`, `error`
- `detected_stack`
- `summary`
- `created_date`

### CodeFile

- `project_id`
- `path`
- `language`
- `content`
- `summary`
- `size`

### CodebaseChatMessage

- `project_id`
- `role`: `user`, `assistant`
- `content`
- `created_date`

## Included in phase 1

- Dashboard project list
- Add Repository page
- Project Detail page
- File list
- Basic stack detection
- Pasted code parser
- AI summary via Base44 Core.InvokeLLM
- AI chat via Base44 function when available, with safe fallback to Core.InvokeLLM

## Intentionally excluded

- GitHub App installation
- private repository access
- automatic repo cloning
- PR webhook handling
- PR comments
- billing
- teams and permissions
- full code graph
- MCP server
- tree-sitter/LSP parser
- vector database
- long-term repository memory

## Accepted pasted-code formats

```txt
--- src/App.jsx ---
export default function App() {
  return <div>Hello</div>;
}
```

```js
// file: src/App.jsx
export default function App() {
  return <div>Hello</div>;
}
```

```python
# file: app/main.py
from fastapi import FastAPI
```

## Definition of done

Phase 1 is done when a user can:

- create a project,
- paste 2-5 code files,
- see detected stack and file list,
- see a short summary,
- ask a codebase question,
- receive an answer grounded in the stored context.
