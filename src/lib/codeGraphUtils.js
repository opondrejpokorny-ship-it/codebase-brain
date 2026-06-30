const SOURCE_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".py", ".css", ".scss", ".json", ".vue", ".svelte"];
const CONFIG_FILES = ["jsconfig.json", "tsconfig.json", "vite.config.js", "vite.config.ts", "next.config.js", "next.config.mjs"];

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

function isAliasImport(value = "") {
  return value.startsWith("@/") || value.startsWith("~/") || value.startsWith("src/");
}

function sourceSnippet(content = "", importPath = "") {
  const lines = String(content || "").split("\n");
  const index = lines.findIndex((line) => line.includes(importPath));
  if (index < 0) return "";
  return lines.slice(Math.max(0, index - 1), Math.min(lines.length, index + 2)).join("\n").slice(0, 500);
}

function candidatePaths(base = "") {
  return [
    base,
    ...SOURCE_EXTENSIONS.map((ext) => `${base}${ext}`),
    ...SOURCE_EXTENSIONS.map((ext) => `${base}/index${ext}`),
  ];
}

function resolveCandidate(base, filePathSet) {
  return candidatePaths(base).find((candidate) => filePathSet.has(normalizePath(candidate))) || null;
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

  return resolveCandidate(resolvedParts.join("/"), filePathSet);
}

function parseJsonSafe(content = "") {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function detectAliasBases(files = []) {
  const bases = [
    { prefix: "@/", base: "src/" },
    { prefix: "~/", base: "src/" },
    { prefix: "src/", base: "src/" },
  ];

  for (const file of files) {
    const path = normalizePath(file.path);
    const content = String(file.content || "");

    if (path === "jsconfig.json" || path === "tsconfig.json") {
      const parsed = parseJsonSafe(content);
      const paths = parsed?.compilerOptions?.paths || {};
      for (const [alias, targets] of Object.entries(paths)) {
        const firstTarget = Array.isArray(targets) ? targets[0] : targets;
        if (!firstTarget) continue;
        bases.push({
          prefix: alias.replace(/\*.*$/, ""),
          base: String(firstTarget).replace(/\*.*$/, ""),
        });
      }
    }

    if (/vite\.config\.[jt]s$/.test(path) || /next\.config\./.test(path)) {
      if (content.includes("@") && content.includes("src")) {
        bases.push({ prefix: "@/", base: "src/" });
      }
    }
  }

  const seen = new Set();
  return bases.filter((item) => {
    const key = `${item.prefix}|${item.base}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return item.prefix;
  });
}

function resolveAliasImport(importPath, filePathSet, aliasBases) {
  for (const alias of aliasBases) {
    if (!importPath.startsWith(alias.prefix)) continue;
    const rest = importPath.slice(alias.prefix.length);
    const base = `${alias.base}${rest}`.replace(/^\.\//, "");
    const resolved = resolveCandidate(base, filePathSet);
    if (resolved) return resolved;
  }
  return null;
}

function extractImportSpecifiers(content = "") {
  const specs = [];
  const patterns = [
    { type: "imports", pattern: /import\s+(?:[^'";]+?\s+from\s+)?["']([^"']+)["']/g },
    { type: "exports_from", pattern: /export\s+[^'";]+?\s+from\s+["']([^"']+)["']/g },
    { type: "requires", pattern: /require\(\s*["']([^"']+)["']\s*\)/g },
    { type: "dynamic_import", pattern: /import\(\s*["']([^"']+)["']\s*\)/g },
    { type: "css_import", pattern: /@import\s+["']([^"']+)["']/g },
  ];

  for (const { type, pattern } of patterns) {
    let match;
    while ((match = pattern.exec(content))) {
      specs.push({ importPath: match[1], relationType: type });
    }
  }

  const seen = new Set();
  return specs.filter((spec) => {
    const key = `${spec.relationType}|${spec.importPath}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 120);
}

function relationConfidence({ importPath, resolvedPath, targetKind }) {
  if (resolvedPath) return 0.9;
  if (targetKind === "external_package") return 0.8;
  if (targetKind === "alias") return 0.45;
  return 0.35;
}

function packageName(importPath = "") {
  if (importPath.startsWith("@")) return importPath.split("/").slice(0, 2).join("/");
  return importPath.split("/")[0];
}

export function buildCodeRelations(files = []) {
  const filePaths = files.map((file) => normalizePath(file.path)).filter(Boolean);
  const filePathSet = new Set(filePaths);
  const aliasBases = detectAliasBases(files);
  const relations = [];

  for (const file of files) {
    const fromPath = normalizePath(file.path);
    const content = String(file.content || "");
    if (!fromPath || !content) continue;

    const imports = extractImportSpecifiers(content);
    for (const spec of imports) {
      const importPath = spec.importPath;
      const relative = isRelativeImport(importPath);
      const alias = !relative && isAliasImport(importPath);
      const resolvedPath = relative
        ? resolveRelativeImport(fromPath, importPath, filePathSet)
        : alias
          ? resolveAliasImport(importPath, filePathSet, aliasBases)
          : null;

      let targetKind = "unknown";
      let relationType = spec.relationType;

      if (resolvedPath) targetKind = "internal_file";
      else if (relative) {
        targetKind = "unresolved";
        relationType = "unresolved_relative";
      } else if (alias) {
        targetKind = "alias";
        relationType = "alias_unresolved";
      } else {
        targetKind = "external_package";
        relationType = "external_package";
      }

      relations.push({
        project_id: file.project_id || null,
        from_file: fromPath,
        to_file: resolvedPath,
        relation_type: relationType,
        import_path: importPath,
        package_name: targetKind === "external_package" ? packageName(importPath) : null,
        target_kind: targetKind,
        confidence: relationConfidence({ importPath, resolvedPath, targetKind }),
        source_snippet: sourceSnippet(content, importPath),
        resolved: Boolean(resolvedPath),
        created_date: new Date().toISOString(),
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

  return [...related].filter((path) => !changed.has(normalizePath(path)));
}

export function summarizeCodeGraph(relations = []) {
  const internal = relations.filter((relation) => relation.target_kind === "internal_file");
  const external = relations.filter((relation) => relation.target_kind === "external_package");
  const unresolved = relations.filter((relation) => relation.relation_type === "unresolved_relative");
  const aliasUnresolved = relations.filter((relation) => relation.relation_type === "alias_unresolved");
  const touchedFiles = new Set(relations.flatMap((relation) => [relation.from_file, relation.to_file]).filter(Boolean));
  const inbound = new Map();
  const outbound = new Map();

  for (const relation of relations) {
    outbound.set(relation.from_file, (outbound.get(relation.from_file) || 0) + 1);
    if (relation.to_file) inbound.set(relation.to_file, (inbound.get(relation.to_file) || 0) + 1);
  }

  const topConnectedFiles = [...new Set([...inbound.keys(), ...outbound.keys()])]
    .map((path) => ({ path, score: (inbound.get(path) || 0) + (outbound.get(path) || 0), inbound: inbound.get(path) || 0, outbound: outbound.get(path) || 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return {
    totalRelations: relations.length,
    internalRelations: internal.length,
    externalImports: external.length,
    unresolvedRelativeImports: unresolved.length,
    aliasUnresolvedImports: aliasUnresolved.length,
    touchedFiles: touchedFiles.size,
    topConnectedFiles,
    configFilesDetected: relations.some((relation) => CONFIG_FILES.some((name) => relation.from_file.endsWith(name))),
  };
}

export function explainWhyFilesAreRelated(relations = [], sourcePath = "", targetPath = "") {
  const source = normalizePath(sourcePath);
  const target = normalizePath(targetPath);
  const matches = relations.filter((relation) => (
    (relation.from_file === source && relation.to_file === target) ||
    (relation.from_file === target && relation.to_file === source)
  ));

  if (!matches.length) return [];
  return matches.map((relation) => (
    relation.from_file === source
      ? `${source} ${relation.relation_type} ${relation.import_path}, resolved to ${target}.`
      : `${target} is connected because it imports ${source} via ${relation.import_path}.`
  ));
}
