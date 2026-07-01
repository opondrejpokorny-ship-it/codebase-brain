# Manual smoke test checklist

Use this checklist after large refactors, CI fixes, routing changes, or repository import changes.

## Automated checks first

Run these before browser testing:

```bash
npm ci
npm run lint
npm run typecheck
npm run build
```

All four commands should pass before manual smoke testing.

## Routes to test

### Dashboard `/`

- App loads without a blank screen.
- Existing projects are listed.
- Empty state is readable when no projects exist.
- Navigation to Add Repository works.

### Add Repository `/add`

Test pasted-code flow:

- Add a project name.
- Paste a small two-file sample using `--- path ---` markers.
- Create project.
- Confirm redirect to `/project/:id`.
- Confirm project summary, file list, and import metadata render.

Test public GitHub URL flow:

- Enter a public GitHub repository URL.
- Keep public import enabled.
- Create project.
- Confirm imported files appear in Project Detail.
- Confirm import metadata includes source, imported count, attempted count, and limits.

Test private/inaccessible URL fallback:

- Enter a private, missing, or inaccessible GitHub URL.
- Keep public import enabled.
- Create project.
- Confirm the project is saved as URL-only.
- Confirm UI explains private access fallback.

### Project Detail `/project/:id`

- Readiness card renders for repository projects.
- Context Efficiency Meter renders when files exist.
- Import Metadata card renders.
- Files panel renders file paths and languages.
- Missing Context Queue card renders without crashing.
- Chat box renders and can accept input.
- Code Relations card renders if relations exist.
- Delete project confirmation opens; do not delete unless testing cleanup.

### Impact Analysis `/project/:id/impact`

- Baseline Context Efficiency Estimate renders when files exist.
- Public PR URL panel renders.
- Context Depth selector shows Minimal, Balanced, Deep.
- Change input accepts a pasted diff.
- Example diff button works.
- Pre-scan panel updates after input.
- Context Pack Inspector renders selected files.
- Relevance score badges are visible when a context pack exists.
- Context depth badge is visible in the inspector.
- Analyze Impact completes or shows a useful error.
- Result shows risk level and markdown report.
- Recent analyses updates after a successful analysis.

### Risk Memory `/project/:id/risk-memory`

- Empty state renders when there is no history.
- Risk count summary renders when analyses exist.
- High-risk files, frequently changed files, repeated risk signals, and common tests sections render.
- Recent analyses list renders.
- Context depth badge appears for new analyses.
- Token stats appear when available.

### Missing Context Import Queue `/project/:id/import-queue`

- Empty state renders when no queue exists.
- Queued targets render when missing context exists.
- Copy prompt works.
- Resolve from GitHub does not crash.
- Clear queue action updates UI.

### Project Rules `/project/:id/rules`

- Rules page loads.
- Existing rules render.
- Add/edit/delete rule flow works if available.
- Impact Analysis still includes active rules in the prompt.

### Code Search `/project/:id/search`

- Search page loads.
- Searching for a known file path returns results.
- Searching for known code text returns results.
- Empty result state is readable.

### Architecture Overview `/project/:id/architecture`

- Overview page loads.
- Graph/relations summaries render if relations exist.
- Empty or incomplete graph states do not crash.

### Runtime Diagnostics `/diagnostics`

- Diagnostics page loads.
- Status cards render without throwing.
- Missing optional backend functions are shown as warnings, not app crashes.

### Installed Repositories `/github/repositories`

- Page loads.
- Empty state renders if no GitHub App repositories are linked.
- Repository list renders if links exist.

## Regression focus after the latest refactor

Pay special attention to:

- Broken import paths from extracted hooks/components.
- Wrong default vs named exports.
- Missing props after component extraction.
- Snake_case vs camelCase history fields.
- Context depth propagation: selector -> hook -> prompt builder -> context pack -> history -> Risk Memory.
- Add Repository flow after moving logic into `useAddRepository` and `addRepositoryRuntime`.
- Active route wrappers:
  - `ProjectDetailWithReadiness`
  - `ImpactAnalysisWithEfficiency`

## Pass criteria

A build is considered smoke-test ready when:

- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run build` passes.
- The main routes above render without blank screens.
- Add Repository can create at least one pasted-code project.
- Impact Analysis can generate a context pack from a pasted diff.
