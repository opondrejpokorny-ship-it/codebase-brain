import { extractProjectSymbols } from "@/lib/symbolExtractionUtils";

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function includesAny(value = "", patterns = []) {
  return patterns.some((pattern) => pattern.test(value));
}

const PRODUCT_AREA_RULES = [
  {
    id: "github-import",
    displayName: "GitHub repository import",
    areaKind: "fixed",
    patterns: [/github|repository|repo|import|installation|webhook/i],
    userActions: ["Connect or paste a repository", "Import project files", "Inspect import readiness"],
    businessOutcome: "A user can bring codebase context into Codebase Brain safely.",
  },
  {
    id: "impact-review",
    displayName: "PR and diff impact review",
    areaKind: "fixed",
    patterns: [/impact|diff|pullrequest|pull-request|pr-|changed|risk|review/i],
    userActions: ["Paste a PR URL", "Paste a diff", "Review risk and tests before merge"],
    businessOutcome: "A user can understand what might break before merging changes.",
  },
  {
    id: "context-pack",
    displayName: "Context pack selection",
    areaKind: "fixed",
    patterns: [/context|token|selection|relevance|pack|budget/i],
    userActions: ["Ask a question", "Inspect selected files", "Export compact context"],
    businessOutcome: "AI receives compact, grounded context instead of a noisy full-repo dump.",
  },
  {
    id: "architecture-lens",
    displayName: "Architecture lens",
    areaKind: "fixed",
    patterns: [/architecture|graph|relation|symbol|route|module|component/i],
    userActions: ["Open architecture overview", "Find modules and routes", "Identify high-risk areas"],
    businessOutcome: "A user can understand the project shape without reading every file.",
  },
  {
    id: "risk-memory",
    displayName: "Risk memory and project rules",
    areaKind: "fixed",
    patterns: [/risk|memory|analysis|history|rules|adr|decision/i],
    userActions: ["Review previous analyses", "Add rules", "Check repeated risk signals"],
    businessOutcome: "The project gets safer over time because prior risks and decisions are reused.",
  },
  {
    id: "diagnostics",
    displayName: "Runtime diagnostics and safety",
    areaKind: "fixed",
    patterns: [/diagnostic|runtime|token|secret|enabled|flag|safety/i],
    userActions: ["Check backend capabilities", "Verify flags", "Avoid unsafe GitHub writes"],
    businessOutcome: "Operators can enable integrations without exposing secrets or causing side effects.",
  },
];

function fileMatchesArea(file = {}, area) {
  const path = String(file.path || "");
  const contentHead = String(file.content || "").slice(0, 8000);
  return includesAny(`${path}\n${contentHead}`, area.patterns);
}

function symbolMatchesArea(symbol = {}, area) {
  return includesAny(`${symbol.symbol_name || ""}\n${symbol.signature || ""}\n${symbol.file_path || ""}`, area.patterns);
}

export function buildProductAreas({ files = [], relations = [], symbols = null } = {}) {
  const projectSymbols = symbols || extractProjectSymbols(files);

  return PRODUCT_AREA_RULES.map((rule) => {
    const supportingFiles = files.filter((file) => fileMatchesArea(file, rule)).map((file) => file.path).slice(0, 18);
    const supportingSymbols = projectSymbols.filter((symbol) => symbolMatchesArea(symbol, rule)).map((symbol) => ({
      name: symbol.symbol_name,
      kind: symbol.symbol_kind,
      file: symbol.file_path,
    })).slice(0, 18);
    const relatedRelations = relations.filter((relation) => supportingFiles.includes(relation.from_file) || supportingFiles.includes(relation.to_file)).slice(0, 20);
    const confidence = supportingFiles.length >= 4 || supportingSymbols.length >= 4 ? "high" : supportingFiles.length || supportingSymbols.length ? "medium" : "low";

    return {
      id: rule.id,
      displayName: rule.displayName,
      displaySummary: rule.businessOutcome,
      areaKind: rule.areaKind,
      confidenceLabel: confidence,
      presentationSafe: confidence !== "low",
      userActions: rule.userActions,
      businessOutcome: rule.businessOutcome,
      supportingFiles,
      supportingSymbols,
      relationEvidence: relatedRelations.map((relation) => `${relation.from_file} ${relation.relation_type} ${relation.to_file || relation.import_path}`),
      technicalEvidence: {
        files: supportingFiles,
        symbols: supportingSymbols,
        relationCount: relatedRelations.length,
      },
    };
  });
}

export function buildProductContextSummary(input = {}) {
  const areas = buildProductAreas(input);
  const activeAreas = areas.filter((area) => area.presentationSafe);
  const thinAreas = areas.filter((area) => !area.presentationSafe);

  return {
    totalAreas: areas.length,
    activeAreas,
    thinAreas,
    areaNames: activeAreas.map((area) => area.displayName),
  };
}

export function formatProductAreasMarkdown(areas = []) {
  const active = areas.filter((area) => area.presentationSafe);
  if (!active.length) return "No product areas were detected from the stored sample.";

  return active.map((area) => {
    const files = area.supportingFiles.slice(0, 8).map((file) => `  - ${file}`).join("\n") || "  - No direct file evidence.";
    const actions = area.userActions.map((action) => `  - ${action}`).join("\n");
    return `### ${area.displayName}\n\n${area.displaySummary}\n\nConfidence: ${area.confidenceLabel}\n\nUser actions:\n${actions}\n\nSupporting files:\n${files}`;
  }).join("\n\n");
}

export function productAreaNamesForPrompt(input = {}) {
  return buildProductAreas(input)
    .filter((area) => area.presentationSafe)
    .map((area) => `${area.displayName}: ${unique(area.supportingFiles).slice(0, 5).join(", ") || "no file evidence"}`)
    .join("\n");
}
