import { summarizeCodeGraph } from "@/lib/codeGraphUtils";
import { extractProjectSymbols, summarizeSymbols } from "@/lib/symbolExtractionUtils";

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function folderName(path = "") {
  const parts = String(path || "").split("/");
  return parts.length > 1 ? parts.slice(0, -1).join("/") : "root";
}

export function buildArchitectureFacts({ project, files = [], relations = [] }) {
  const paths = files.map((file) => file.path || "").filter(Boolean);
  const graphSummary = summarizeCodeGraph(relations);
  const symbols = extractProjectSymbols(files);
  const symbolSummary = summarizeSymbols(symbols);
  const externalPackages = unique(relations.filter((relation) => relation.target_kind === "external_package").map((relation) => relation.package_name || relation.import_path)).slice(0, 40);

  const frontendFolders = unique(paths.filter((path) => /src\/pages|src\/components|app\/|pages\/|components\//i.test(path)).map(folderName)).slice(0, 20);
  const backendFolders = unique(paths.filter((path) => /api|server|backend|base44\/functions|functions|routes|controllers/i.test(path)).map(folderName)).slice(0, 20);
  const routeFiles = paths.filter((path) => /route|router|page|app\.(jsx|tsx|js|ts)|layout/i.test(path)).slice(0, 30);
  const configFiles = paths.filter((path) => /package\.json|vite\.config|next\.config|tsconfig|jsconfig|tailwind|eslint|base44\/config/i.test(path)).slice(0, 30);
  const dataFiles = paths.filter((path) => /schema|model|entity|prisma|database|db|migration|storage/i.test(path)).slice(0, 30);
  const integrationFiles = paths.filter((path) => /stripe|comgate|github|webhook|openai|telegram|whatsapp|api|integration/i.test(path)).slice(0, 30);
  const highRiskFiles = paths.filter((path) => /auth|login|session|permission|role|admin|payment|checkout|refund|credit|billing|subscription|webhook|security|database|schema|migration|delete/i.test(path)).slice(0, 40);

  return {
    projectName: project?.name || "Unknown project",
    repositoryUrl: project?.repository_url || null,
    detectedStack: project?.detected_stack || [],
    fileCount: files.length,
    graphSummary,
    symbolSummary,
    frontendFolders,
    backendFolders,
    routeFiles,
    configFiles,
    dataFiles,
    integrationFiles,
    externalPackages,
    highRiskFiles,
    topSymbols: symbols.slice(0, 80).map((symbol) => ({
      name: symbol.symbol_name,
      kind: symbol.symbol_kind,
      file: symbol.file_path,
      signature: symbol.signature,
    })),
    warnings: [
      files.length === 0 ? "No stored files are available." : null,
      project?.import_metadata?.truncatedTree ? "The imported repository tree was truncated by MVP limits." : null,
      project?.import_metadata?.finalFilesCount && project.import_metadata.finalFilesCount < project.import_metadata.attemptedFiles ? "Only a limited sample of repository files was imported." : null,
      graphSummary.unresolvedRelativeImports || graphSummary.aliasUnresolvedImports ? "Some imports are unresolved, so graph coverage is incomplete." : null,
    ].filter(Boolean),
  };
}

export function formatArchitectureFactsMarkdown(facts) {
  return `## What this project is\n${facts.projectName}${facts.repositoryUrl ? `\n${facts.repositoryUrl}` : ""}\n\n## Tech stack\n${facts.detectedStack.length ? facts.detectedStack.join(", ") : "Unknown from stored sample"}\n\n## Main folders\nFrontend: ${facts.frontendFolders.join(", ") || "Not detected"}\nBackend/API: ${facts.backendFolders.join(", ") || "Not detected"}\n\n## Frontend structure\n${facts.routeFiles.slice(0, 12).map((path) => `- ${path}`).join("\n") || "No route/page files detected."}\n\n## Backend/API structure\n${facts.backendFolders.map((folder) => `- ${folder}`).join("\n") || "No backend/API folders detected."}\n\n## Data/entities\n${facts.dataFiles.slice(0, 12).map((path) => `- ${path}`).join("\n") || "No data/entity files detected."}\n\n## Integrations\n${facts.integrationFiles.slice(0, 12).map((path) => `- ${path}`).join("\n") || "No integration files detected."}\n\n## External packages\n${facts.externalPackages.slice(0, 20).join(", ") || "No external packages detected."}\n\n## High-risk areas\n${facts.highRiskFiles.slice(0, 16).map((path) => `- ${path}`).join("\n") || "No high-risk paths detected from stored sample."}\n\n## Symbols\n${facts.topSymbols.slice(0, 20).map((symbol) => `- ${symbol.kind}: ${symbol.name} (${symbol.file})`).join("\n") || "No symbols detected."}\n\n## Unknowns / missing context\n${facts.warnings.map((warning) => `- ${warning}`).join("\n") || "- No major missing-context warning detected."}`;
}
