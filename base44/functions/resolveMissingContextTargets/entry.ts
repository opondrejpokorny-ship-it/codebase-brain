import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Targeted missing-context resolver for Codebase Brain.
// Safe phase: public GitHub reads only, Base44 entity writes only, no GitHub writes.

const MAX_FILE_BYTES = 35_000;
const MAX_TARGETS = 80;
const MAX_TREE_ENTRIES = 10_000;
const RESOLVE_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.py', '.go', '.rs', '.java', '.php', '.css', '.scss', '.json', '.md', '.yml', '.yaml'
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization, x-requested-with',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

async function readBody(request) {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? body : {};
  } catch (_) {
    return {};
  }
}

function env(name) {
  try {
    return Deno?.env?.get?.(name) || null;
  } catch (_) {
    return null;
  }
}

function optionalGithubToken() {
  return env('GITHUB_TOKEN') || env('CODEBASE_BRAIN_GITHUB_TOKEN');
}

function githubHeaders(extra = {}) {
  const token = optionalGithubToken();
  return {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'codebase-brain-base44',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function fetchGithubJson(url) {
  const response = await fetch(url, { headers: githubHeaders() });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.message ? `GitHub request failed: ${body.message}` : `GitHub request failed: ${response.status}`);
  }
  return body;
}

async function fetchRawGithubFile({ owner, repo, branch, path }) {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const url = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${encodedPath}`;
  const response = await fetch(url, { headers: githubHeaders({ Accept: 'text/plain,*/*' }) });
  if (!response.ok) throw new Error(`Raw file request failed for ${path}: ${response.status}`);
  const text = await response.text();
  return text.slice(0, MAX_FILE_BYTES);
}

function parseGitHubRepoUrl(url = '') {
  const match = String(url || '').trim().match(/^https?:\/\/github\.com\/([^/\s]+)\/([^/\s#?]+)(?:[\s/#?].*)?$/i);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/i, '') };
}

function normalizePath(path = '') {
  return String(path || '').replace(/^\/+/, '').replace(/^\.\//, '').replace(/\/+/g, '/').trim();
}

function normalizeTarget(target = '') {
  return normalizePath(target)
    .replace(/^@\//, 'src/')
    .replace(/^~\//, 'src/')
    .replace(/\.(js|jsx|ts|tsx|mjs|cjs|py|go|rs|java|php|css|scss|json|md|yml|yaml)$/i, '')
    .replace(/\/index$/i, '');
}

function targetFromInput(item) {
  if (typeof item === 'string') return normalizeTarget(item);
  return normalizeTarget(item?.target || item?.path || item?.file || '');
}

function dedupe(values) {
  return [...new Set(values.filter(Boolean))];
}

function candidatePathsForTarget(target = '') {
  const clean = normalizeTarget(target);
  if (!clean) return [];
  const candidates = new Set([clean]);
  for (const ext of RESOLVE_EXTENSIONS) {
    candidates.add(`${clean}${ext}`);
    candidates.add(`${clean}/index${ext}`);
  }
  if (!clean.startsWith('src/')) {
    candidates.add(`src/${clean}`);
    for (const ext of RESOLVE_EXTENSIONS) {
      candidates.add(`src/${clean}${ext}`);
      candidates.add(`src/${clean}/index${ext}`);
    }
  }
  return [...candidates].map(normalizePath);
}

function detectLanguageFromPath(path = '') {
  const filename = path.split('/').pop() || '';
  if (filename === 'Dockerfile') return 'Docker';
  if (filename === 'package.json') return 'JSON';
  if (filename === 'schema.prisma') return 'Prisma';
  const ext = filename.includes('.') ? filename.split('.').pop().toLowerCase() : 'txt';
  const byExt = {
    js: 'JavaScript', jsx: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript',
    ts: 'TypeScript', tsx: 'TypeScript', py: 'Python', go: 'Go', rs: 'Rust',
    java: 'Java', php: 'PHP', css: 'CSS', scss: 'SCSS', json: 'JSON', md: 'Markdown',
    yml: 'YAML', yaml: 'YAML', sql: 'SQL', sh: 'Shell', prisma: 'Prisma',
  };
  return byExt[ext] || ext.toUpperCase();
}

const SOURCE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.py', '.css', '.scss', '.json', '.vue', '.svelte'];

function dirname(path = '') {
  const parts = normalizePath(path).split('/');
  parts.pop();
  return parts.join('/');
}

function withoutExtension(path = '') {
  const ext = SOURCE_EXTENSIONS.find((item) => path.endsWith(item));
  return ext ? path.slice(0, -ext.length) : path;
}

function buildCandidatePaths(base = '') {
  return [
    base,
    ...SOURCE_EXTENSIONS.map((ext) => `${base}${ext}`),
    ...SOURCE_EXTENSIONS.map((ext) => `${base}/index${ext}`),
  ].map(normalizePath);
}

function resolveCandidate(base, filePathSet) {
  const candidates = buildCandidatePaths(base);
  const exact = candidates.find((candidate) => filePathSet.has(candidate));
  if (exact) return exact;
  const lowerMap = new Map([...filePathSet].map((path) => [path.toLowerCase(), path]));
  for (const candidate of candidates) {
    const match = lowerMap.get(candidate.toLowerCase());
    if (match) return match;
  }
  return null;
}

function resolveRelativeImport(fromPath, importPath, filePathSet) {
  const baseDir = dirname(fromPath);
  const rawParts = `${baseDir}/${importPath}`.split('/').filter(Boolean);
  const resolvedParts = [];
  for (const part of rawParts) {
    if (part === '.') continue;
    if (part === '..') resolvedParts.pop();
    else resolvedParts.push(part);
  }
  return resolveCandidate(resolvedParts.join('/'), filePathSet);
}

function resolveAliasImport(importPath, filePathSet) {
  const normalized = importPath.replace(/^@\//, 'src/').replace(/^~\//, 'src/');
  return resolveCandidate(normalized, filePathSet) || resolveCandidate(normalized.replace(/^src\//, ''), filePathSet);
}

function isRelativeImport(value = '') {
  return value.startsWith('./') || value.startsWith('../');
}

function isAliasImport(value = '') {
  return value.startsWith('@/') || value.startsWith('~/') || value.startsWith('src/');
}

function packageName(importPath = '') {
  if (importPath.startsWith('@')) return importPath.split('/').slice(0, 2).join('/');
  return importPath.split('/')[0];
}

function extractImportSpecifiers(content = '') {
  const specs = [];
  const patterns = [
    { type: 'imports', pattern: /import\s+(?:[^'";]+?\s+from\s+)?["']([^"']+)["']/g },
    { type: 'exports_from', pattern: /export\s+[^'";]+?\s+from\s+["']([^"']+)["']/g },
    { type: 'requires', pattern: /require\(\s*["']([^"']+)["']\s*\)/g },
    { type: 'dynamic_import', pattern: /import\(\s*["']([^"']+)["']\s*\)/g },
    { type: 'css_import', pattern: /@import\s+["']([^"']+)["']/g },
  ];
  for (const { type, pattern } of patterns) {
    let match;
    while ((match = pattern.exec(content))) specs.push({ importPath: match[1], relationType: type });
  }
  const seen = new Set();
  return specs.filter((spec) => {
    const key = `${spec.relationType}|${spec.importPath}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 120);
}

function sourceSnippet(content = '', importPath = '') {
  const lines = String(content || '').split('\n');
  const index = lines.findIndex((line) => line.includes(importPath));
  if (index < 0) return '';
  return lines.slice(Math.max(0, index - 1), Math.min(lines.length, index + 2)).join('\n').slice(0, 500);
}

function buildCodeRelations(files = [], projectId = null) {
  const filePaths = files.map((file) => normalizePath(file.path)).filter(Boolean);
  const filePathSet = new Set(filePaths);
  const relations = [];

  for (const file of files) {
    const fromPath = normalizePath(file.path);
    const content = String(file.content || '');
    if (!fromPath || !content) continue;
    const imports = extractImportSpecifiers(content);
    for (const spec of imports) {
      const importPath = spec.importPath;
      const relative = isRelativeImport(importPath);
      const alias = !relative && isAliasImport(importPath);
      const resolvedPath = relative
        ? resolveRelativeImport(fromPath, importPath, filePathSet)
        : alias
          ? resolveAliasImport(importPath, filePathSet)
          : null;
      let targetKind = 'unknown';
      let relationType = spec.relationType;
      if (resolvedPath) targetKind = 'internal_file';
      else if (relative) {
        targetKind = 'unresolved';
        relationType = 'unresolved_relative';
      } else if (alias) {
        targetKind = 'alias';
        relationType = 'alias_unresolved';
      } else {
        targetKind = 'external_package';
        relationType = 'external_package';
      }
      relations.push({
        project_id: projectId,
        from_file: fromPath,
        to_file: resolvedPath,
        relation_type: relationType,
        import_path: importPath,
        package_name: targetKind === 'external_package' ? packageName(importPath) : null,
        target_kind: targetKind,
        confidence: resolvedPath ? 0.9 : targetKind === 'external_package' ? 0.8 : 0.35,
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

function relationKey(relation) {
  return `${relation.project_id || ''}|${relation.from_file}|${relation.relation_type}|${relation.to_file || relation.import_path}`;
}

async function upsertCodeFile(base44, projectId, file) {
  const entity = base44.entities.CodeFile;
  const existing = await entity.filter({ project_id: projectId, path: file.path }).catch(() => []);
  if (Array.isArray(existing) && existing[0]?.id && entity.update) {
    const updated = await entity.update(existing[0].id, file);
    return { record: updated || { ...existing[0], ...file }, action: 'updated' };
  }
  const created = await entity.create(file);
  return { record: created || file, action: 'created' };
}

async function persistRelations(base44, projectId, files) {
  const entity = base44.entities.CodeRelation;
  const relations = buildCodeRelations(files, projectId);
  if (!entity?.filter || !entity?.create || !entity?.update) {
    return { persisted: false, reason: 'CodeRelation entity is not available', relations_count: relations.length };
  }

  const existing = await entity.filter({ project_id: projectId }, 'created_date', 1000).catch(() => []);
  const byKey = new Map((existing || []).map((relation) => [relationKey(relation), relation]));
  let created = 0;
  let updated = 0;
  for (const relation of relations) {
    const current = byKey.get(relationKey(relation));
    if (current?.id) {
      await entity.update(current.id, relation);
      updated += 1;
    } else {
      await entity.create(relation);
      created += 1;
    }
  }
  return { persisted: true, relations_count: relations.length, created, updated };
}

function importMetadataForProject(project) {
  const metadata = project?.import_metadata || project?.importMetadata || null;
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {};
}

function appendResolveMetadata(metadata, record) {
  const previous = Array.isArray(metadata.focusedResolveHistory) ? metadata.focusedResolveHistory : [];
  const resolvedTargets = new Set((record.imported_files || []).map((file) => normalizeTarget(file.target || file.path)));
  const previousQueue = Array.isArray(metadata.missingContextQueue) ? metadata.missingContextQueue : [];
  const nextQueue = previousQueue.filter((item) => !resolvedTargets.has(normalizeTarget(item?.target || item)));
  return {
    ...metadata,
    focusedResolveHistory: [...previous, record].slice(-20),
    missingContextQueue: nextQueue,
    missingContextQueueUpdatedAt: new Date().toISOString(),
    lastFocusedResolveAt: record.resolved_at,
  };
}

async function loadProject(base44, projectId) {
  if (!projectId) return null;
  const projects = await base44.entities.CodebaseProject.filter({ id: projectId }).catch(() => []);
  return projects?.[0] || null;
}

async function handleRequest(request) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const base44 = createClientFromRequest(request);
    const user = await base44.auth.me();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await readBody(request);
    const projectId = body.project_id || body.projectId || null;
    const project = await loadProject(base44, projectId);
    const repositoryUrl = body.repository_url || body.repositoryUrl || project?.repository_url || '';
    const parsed = parseGitHubRepoUrl(repositoryUrl);
    if (!projectId) return jsonResponse({ error: 'Missing project_id' }, 400);
    if (!parsed) return jsonResponse({ error: 'Project does not have a valid public GitHub repository URL.' }, 400);

    const targets = dedupe((body.targets || body.currentMissingTargets || body.queue || []).map(targetFromInput)).slice(0, MAX_TARGETS);
    if (!targets.length) return jsonResponse({ error: 'No missing-context targets provided.' }, 400);

    const { owner, repo } = parsed;
    const repoMeta = await fetchGithubJson(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
    const branch = body.branch || repoMeta.default_branch || 'main';
    const treeResult = await fetchGithubJson(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
    const tree = Array.isArray(treeResult.tree) ? treeResult.tree.slice(0, MAX_TREE_ENTRIES) : [];
    const treePaths = new Set(tree.filter((entry) => entry.type === 'blob' && entry.path).map((entry) => entry.path));

    const existingFiles = await base44.entities.CodeFile.filter({ project_id: projectId }, 'path', 1000).catch(() => []);
    const existingPathSet = new Set((existingFiles || []).map((file) => normalizePath(file.path)));
    const imported = [];
    const misses = [];

    for (const target of targets) {
      const candidates = candidatePathsForTarget(target);
      const exactPath = candidates.find((candidate) => treePaths.has(candidate));
      if (!exactPath) {
        misses.push({ target, reason: 'No matching repository file found.', candidates: candidates.slice(0, 20) });
        continue;
      }

      try {
        const content = await fetchRawGithubFile({ owner, repo, branch, path: exactPath });
        const file = {
          project_id: projectId,
          path: exactPath,
          language: detectLanguageFromPath(exactPath),
          content,
          size: content.length,
        };
        const result = await upsertCodeFile(base44, projectId, file);
        existingPathSet.add(exactPath);
        imported.push({ target, path: exactPath, action: result.action, size: content.length, language: file.language });
      } catch (error) {
        misses.push({ target, path: exactPath, reason: error?.message || String(error) });
      }
    }

    const nextFiles = imported.length
      ? await base44.entities.CodeFile.filter({ project_id: projectId }, 'path', 1000).catch(() => existingFiles)
      : existingFiles;
    const relation_persistence = await persistRelations(base44, projectId, nextFiles || []);

    const resolveRecord = {
      source: 'resolveMissingContextTargets',
      repository_full_name: `${owner}/${repo}`,
      branch,
      requested_targets: targets,
      imported_files: imported,
      misses,
      resolved_at: new Date().toISOString(),
    };

    let project_updated = false;
    if (project?.id && base44.entities.CodebaseProject?.update) {
      const nextImportMetadata = appendResolveMetadata(importMetadataForProject(project), resolveRecord);
      await base44.entities.CodebaseProject.update(project.id, {
        status: imported.length > 0 ? 'indexed' : project.status,
        import_metadata: nextImportMetadata,
      }).then(() => { project_updated = true; }).catch(() => { project_updated = false; });
    }

    return jsonResponse({
      status: 'ok',
      mode: 'targeted_context_import',
      repositoryFullName: `${owner}/${repo}`,
      branch,
      requested_count: targets.length,
      resolved_count: imported.length,
      imported_count: imported.length,
      importedFiles: imported,
      resolvedFiles: imported,
      misses,
      relation_persistence,
      project_updated,
      github_writes_enabled: false,
      private_import_started: false,
    });
  } catch (error) {
    return jsonResponse({ error: error?.message || String(error), source: 'resolveMissingContextTargets' }, 500);
  }
}

Deno.serve(handleRequest);
