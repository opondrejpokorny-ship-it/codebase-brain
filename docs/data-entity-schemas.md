# Data entity schemas

This document defines the optional persisted records for the next Codebase Brain phases. The current app remains local-first and works without these records. These schemas are the contract for later Base44 entity setup and backend import/rebuild flows.

## CodeRelation

Stores one deterministic relation between two code locations or between a file and an external import.

Recommended fields:

- `id`: stable string id generated from project, source file, relation type, and target.
- `project_id`: CodebaseProject id.
- `schema_version`: graph schema version, currently `code-graph-lite-v2`.
- `from_file`: source file path.
- `to_file`: resolved target file path, nullable.
- `relation_type`: relation kind, such as `internal_import`, `external_import`, `unresolved_relative_import`, or `alias_unresolved_import`.
- `import_path`: raw import path when applicable.
- `package_name`: external package name when applicable.
- `target_kind`: `file`, `package`, `missing`, or `unknown`.
- `confidence`: numeric confidence score.
- `source_snippet`: short evidence snippet.
- `resolved`: boolean.
- `relation_key`: stable key without project prefix.
- `created_date`: created timestamp.
- `updated_date`: latest rebuild timestamp.

## CodeSymbol

Stores one extracted symbol from a stored code file.

Recommended fields:

- `id`: stable string id generated from project, file, symbol kind, symbol name, and start line.
- `project_id`: CodebaseProject id.
- `schema_version`: symbol schema version, currently `symbol-lite-v1`.
- `file_path`: source file path.
- `symbol_name`: extracted symbol name.
- `symbol_kind`: function, class, component, hook, type, interface, variable, route, or unknown.
- `signature`: compact signature text.
- `line_start`: first known line.
- `line_end`: last known line or line_start fallback.
- `export_type`: default, named, module, or null.
- `confidence`: numeric confidence score.
- `symbol_key`: stable key without project prefix.
- `created_date`: created timestamp.
- `updated_date`: latest rebuild timestamp.

## DecisionMemory

Stores product or architecture decisions as ADR-like records.

Recommended fields:

- `id`: stable or generated id.
- `project_id`: CodebaseProject id.
- `title`: short decision title.
- `status`: proposed, accepted, rejected, deprecated, or superseded.
- `decision`: concise decision text.
- `rationale`: why the decision exists.
- `files`: related file paths.
- `symbols`: related symbol names or keys.
- `tags`: product/architecture tags.
- `source`: manual, import, or analysis.
- `created_date`: created timestamp.
- `updated_date`: last edited timestamp.

## ContextPack

Stores a reusable exported context pack used by impact analysis or agent handoff.

Recommended fields:

- `id`: generated id.
- `project_id`: CodebaseProject id.
- `schema_version`: `context-pack-export-v1`.
- `depth`: context depth.
- `depth_preset`: user-facing preset label.
- `max_tokens`: selected token budget.
- `estimated_tokens`: estimated selected context tokens.
- `project_summary`: compact project summary used in prompts.
- `changed_files`: changed file paths used for selection.
- `selected_file_paths`: selected stored file paths.
- `selected_files`: selected file metadata and optional content snapshot.
- `selected_relations`: relation evidence included in the pack.
- `graph_summary`: graph summary at export time.
- `coverage`: coverage and missing-context summary.
- `efficiency`: token savings summary.
- `warnings`: context warnings.
- `created_date`: created timestamp.

## CodebaseAnalysis

Stores internal impact analysis and PR review results.

Recommended fields:

- `id`: generated id.
- `project_id`: CodebaseProject id.
- `type`: manual_diff_impact, public_github_pr_impact, pr_inbox_pending, or webhook_pr_analysis.
- `input`: diff, PR text, or changed file list.
- `result`: rendered Markdown report.
- `risk_level`: low, medium, high, or pending.
- `review_verdict`: SAFE, REVIEW, or BLOCK when available.
- `risk_calibration_version`: numeric calibration version.
- `changed_files`: changed paths.
- `changed_symbols`: extracted changed symbols.
- `related_files`: deterministic related paths.
- `risk_signals`: deterministic risk signals.
- `relevant_files`: files selected for analysis.
- `relevant_relations`: relation evidence used.
- `context_depth`: selected context depth.
- `context_depth_preset`: selected preset label.
- `context_selected_tokens`: selected file token estimate.
- `context_total_tokens`: total prompt token estimate.
- `context_full_repo_tokens`: full repo estimate.
- `context_savings_percent`: estimated savings.
- `repository_compatibility`: selected project vs PR repo compatibility object.
- `pr_metadata`: PR title, URL, number, refs, state, and counts.
- `created_date`: created timestamp.

## Migration order

1. Create read-compatible entities without making UI require them.
2. Keep local-storage fallback for DecisionMemory, PR Inbox, and Risk Memory.
3. Add write path behind feature detection.
4. Add rebuild/import persistence after dry-run Graph Snapshot output is stable.
5. Backfill old local records only after export/import paths are tested.

## Safety

- These schemas do not grant write access to GitHub.
- Private repository tokens must remain backend-only.
- Analysis records must not claim tests were run unless a verified CI/test source is attached.
- Missing context must remain visible in reports and exported packs.
