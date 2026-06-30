const SOURCE_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".py", ".css", ".scss", ".json"];

function normalizePath(path = "") {
  return String(path || "").replace(/^\.\//, "").replace(/\/+/g, "/");
}

function dirname(path = "") {
  const normalized = normalizePath(path);
  const parts = normalized.split("/");
  parts.pop();
  return parts.join("/");
}

function withoutExtension(path = "") {
  const ext = SOURCE_EXTENSIONS.find((item) => path.endsWith(item));
  return ext ? path.slice(0, -ext.length) : path;
}

function isRelativeImport(value = "") {
  return value.startsWith("./") || value.startsWith("../");
}

function resolveRelativeImport(fromPath, importPath, filePathSet) {
  const baseDir = dirname(fromPath);
  const rawParts = `${baseDir}/${importPath}`.split("/").filter(Boolean);
  const resolvedParts = [];

  for (const part of rawParts) {
    if (part === ".") continue;
    if (part === "..") resolvedParts.pop();
    else resolvedParts.push(part);
  }

  const base = resolvedParts.join("/");
  const candidates = [
    base,
    ...SOURCE_EXTENSIONS.map((ext) => `${base}${ext}`),
    ...SOURCE_EXTENSIONS.map((ext) => `${base}/index${ext}`),
  ];

  return candidates.find((candidate) => filePathSet.has(candidate)) || null;
}

function extractImportSpecifiers(content = "") {
  const specs = [];
  const patterns = [
    /import\s+(?:[^'";]+?\s+from\s+)?["']([^"']+)["']/g,
    /export\s+[^'";]+?\s+from\s+["']([^"']+)["']/g,
    /require\(\s*["']([^"']+)["']\s*\)/g,
    /import\(\s*["']([^"']+)["']\s*\)/g,
    /@import\s+["']([^"']+)["']/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content))) {
      specs.push(match[1]);
    }
  }

  return [...new Set(specs)].slice(0, 80);
}

function relationConfidence(fromFile, importPath, resolvedPath) {
  if (!resolvedPath) return 0.35;
  if (withoutExtension(resolvedPath).endsWith(withoutExtension(importPath).replace(/^\.\//, ""))) return 0.9;
  if (dirname(resolvedPath) === dirname(fromFile.path)) return 0.85;
  return 0.75;
}

export function buildCodeRelations(files = []) {
  const filePaths = files.map((file) => normalizePath(file.path)).filter(Boolean);
  const filePathSet = new Set(filePaths);
  const relations = [];

  for (const file of files) {
    const fromPath = normalizePath(file.path);
    const content = String(file.content || "");
    if (!fromPath || !content) continue;

    const imports = extractImportSpecifiers(content);
    for (const importPath of imports) {
      const isRelative = isRelativeImport(importPath);
      const resolvedPath = isRelative ? resolveRelativeImport(fromPath, importPath, filePathSet) : null;
      const relationType = isRelative ? "imports" : "external_import";

      relations.push({
        project_id: file.project_id || null,
        from_file: fromPath,
        to_file: resolvedPath,
        import_path: importPath,
        relation_type: relationType,
        confidence: relationConfidence(file, importPath, resolvedPath),
        resolved: Boolean(resolvedPath),
      });
    }
  }

  const seen = new Set();
  return relations.filter((relation) => {
    const key = `${relation.from_file}|${relation.relation_type}|${relation.to_file || relation.import_path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function relatedPathsForChangedFiles(relations = [], changedFiles = []) {
  const changed = new Set(changedFiles.map(normalizePath));
  const related = new Set();

  for (const relation of relations) {
    if (changed.has(relation.from_file) && relation.to_file) related.add(relation.to_file);
    if (relation.to_file && changed.has(relation.to_file)) related.add(relation.from_file);
  }

  return [...related];
}

export function summarizeCodeGraph(relations = []) {
  const internal = relations.filter((relation) => relation.resolved && relation.relation_type === "imports");
  const external = relations.filter((relation) => relation.relation_type === "external_import");
  const unresolved = relations.filter((relation) => relation.relation_type === "imports" && !relation.resolved);
  const touchedFiles = new Set(relations.flatMap((relation) => [relation.from_file, relation.to_file]).filter(Boolean));

  return {
    totalRelations: relations.length,
    internalRelations: internal.length,
    externalImports: external.length,
    unresolvedRelativeImports: unresolved.length,
    touchedFiles: touchedFiles.size,
  };
}
