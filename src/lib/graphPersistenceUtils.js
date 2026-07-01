// @ts-nocheck
import { buildCodeRelations, summarizeCodeGraph } from "@/lib/codeGraphUtils";
import { extractProjectSymbols, summarizeSymbols } from "@/lib/symbolExtractionUtils";

const GRAPH_SCHEMA_VERSION = "code-graph-lite-v2";
const SYMBOL_SCHEMA_VERSION = "symbol-lite-v1";

function stableId(parts = []) {
  return parts
    .map((part) => String(part || "").trim().toLowerCase())
    .filter(Boolean)
    .join("::")
    .replace(/[^a-z0-9_./:@|-]+/g, "-")
    .slice(0, 240);
}

function nowIso() {
  return new Date().toISOString();
}

export function buildPersistentCodeRelationRecords({ projectId = null, relations = [], createdAt = nowIso() } = {}) {
  return relations.map((relation) => ({
    id: stableId([projectId, relation.from_file, relation.relation_type, relation.to_file || relation.import_path]),
    project_id: projectId || relation.project_id || null,
    schema_version: GRAPH_SCHEMA_VERSION,
    from_file: relation.from_file,
    to_file: relation.to_file || null,
    relation_type: relation.relation_type,
    import_path: relation.import_path || null,
    package_name: relation.package_name || null,
    target_kind: relation.target_kind || "unknown",
    confidence: Number(relation.confidence || 0),
    source_snippet: relation.source_snippet || "",
    resolved: Boolean(relation.resolved || relation.to_file),
    relation_key: stableId([relation.from_file, relation.relation_type, relation.to_file || relation.import_path]),
    created_date: relation.created_date || createdAt,
    updated_date: createdAt,
  }));
}

export function buildPersistentCodeSymbolRecords({ projectId = null, symbols = [], createdAt = nowIso() } = {}) {
  return symbols.map((symbol) => ({
    id: stableId([projectId, symbol.file_path, symbol.symbol_kind, symbol.symbol_name, symbol.line_start]),
    project_id: projectId || symbol.project_id || null,
    schema_version: SYMBOL_SCHEMA_VERSION,
    file_path: symbol.file_path,
    symbol_name: symbol.symbol_name,
    symbol_kind: symbol.symbol_kind,
    signature: symbol.signature || "",
    line_start: symbol.line_start || null,
    line_end: symbol.line_end || symbol.line_start || null,
    export_type: symbol.export_type || null,
    confidence: Number(symbol.confidence || 0),
    symbol_key: stableId([symbol.file_path, symbol.symbol_kind, symbol.symbol_name]),
    created_date: symbol.created_date || createdAt,
    updated_date: createdAt,
  }));
}

export function buildGraphSnapshot({ project = null, files = [], relations = null, createdAt = nowIso() } = {}) {
  const projectId = project?.id || files?.[0]?.project_id || null;
  const graphRelations = relations || buildCodeRelations(files);
  const symbols = extractProjectSymbols(files);
  const relationRecords = buildPersistentCodeRelationRecords({ projectId, relations: graphRelations, createdAt });
  const symbolRecords = buildPersistentCodeSymbolRecords({ projectId, symbols, createdAt });
  const graphSummary = summarizeCodeGraph(graphRelations);
  const symbolSummary = summarizeSymbols(symbols);

  return {
    schema_version: GRAPH_SCHEMA_VERSION,
    project_id: projectId,
    project_name: project?.name || null,
    repository_url: project?.repository_url || null,
    generated_at: createdAt,
    file_count: files.length,
    relation_count: relationRecords.length,
    symbol_count: symbolRecords.length,
    graph_summary: graphSummary,
    symbol_summary: symbolSummary,
    coverage: {
      unresolved_imports: graphSummary.unresolvedRelativeImports + graphSummary.aliasUnresolvedImports,
      internal_relations: graphSummary.internalRelations,
      external_imports: graphSummary.externalImports,
      top_connected_files: graphSummary.topConnectedFiles,
    },
    relations: relationRecords,
    symbols: symbolRecords,
  };
}

export function buildGraphExportJson(input = {}) {
  return JSON.stringify(buildGraphSnapshot(input), null, 2);
}

export async function persistGraphSnapshot({ project = null, files = [], relations = null, entities = {}, dryRun = false } = {}) {
  const snapshot = buildGraphSnapshot({ project, files, relations });
  const relationEntity = entities.CodeRelation;
  const symbolEntity = entities.CodeSymbol;

  if (dryRun || (!relationEntity?.create && !symbolEntity?.create)) {
    return {
      persisted: false,
      reason: dryRun ? "dry_run" : "missing_entities",
      snapshot,
    };
  }

  const result = {
    persisted: true,
    relation_records_attempted: snapshot.relations.length,
    symbol_records_attempted: snapshot.symbols.length,
    relation_records_saved: 0,
    symbol_records_saved: 0,
    errors: [],
    snapshot,
  };

  if (relationEntity?.create) {
    for (const record of snapshot.relations) {
      try {
        await relationEntity.create(record);
        result.relation_records_saved += 1;
      } catch (error) {
        result.errors.push({ type: "relation", key: record.relation_key, message: error?.message || "Failed to persist relation" });
      }
    }
  }

  if (symbolEntity?.create) {
    for (const record of snapshot.symbols) {
      try {
        await symbolEntity.create(record);
        result.symbol_records_saved += 1;
      } catch (error) {
        result.errors.push({ type: "symbol", key: record.symbol_key, message: error?.message || "Failed to persist symbol" });
      }
    }
  }

  return result;
}

export function graphSnapshotToMarkdown(snapshot = {}) {
  const topFiles = snapshot.coverage?.top_connected_files || [];
  return `# Code Graph Snapshot\n\nGenerated: ${snapshot.generated_at || "unknown"}\n\n## Counts\n\n- Files: ${snapshot.file_count || 0}\n- Relations: ${snapshot.relation_count || 0}\n- Symbols: ${snapshot.symbol_count || 0}\n- Unresolved imports: ${snapshot.coverage?.unresolved_imports || 0}\n\n## Top connected files\n\n${topFiles.map((file) => `- ${file.path}: ${file.score} links (${file.inbound} in / ${file.outbound} out)`).join("\n") || "No connected files detected."}\n`;
}
