import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Backend chat now mirrors the frontend Context Pack idea:
// deterministic graph/symbol/relevance selection first, LLM second.

const DEPTH_PRESETS = {
  minimal: { maxTokens: 6000, minPositiveFiles: 2, label: 'Minimal' },
  balanced: { maxTokens: 12000, minPositiveFiles: 4, label: 'Balanced' },
  deep: { maxTokens: 24000, minPositiveFiles: 8, label: 'Deep' },
};

const IMPORTANT_PATH_PATTERNS = [
  /package\.json$/i,
  /src\/api\//i,
  /base44\/functions\//i,
  /server|function|webhook/i,
  /auth|login|session|permission|role|admin/i,
  /payment|checkout|refund|credit|billing|subscription/i,
  /schema|migration|database|db|entity/i,
  /route|router|page/i,
  /config|vite|next|tsconfig|jsconfig/i,
];

const LOW_VALUE_PATTERNS = [
  /\.lock$/i,
  /package-lock\.json$/i,
  /yarn\.lock$/i,
  /pnpm-lock\.yaml$/i,
  /snapshot/i,
  /dist\//i,
  /build\//i,
  /coverage\//i,
];

const SOURCE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.py', '.css', '.scss', '.json', '.vue', '.svelte'];

function normalizePath(path = '') {
  return String(path || '').replace(/^\.\//, '').replace(/\/+/g, '/');
}

function dirname(path = '') {
  const parts = normalizePath(path).split('/');
  parts.pop();
  return parts.join('/');
}

function estimateTokens(text = '') {
  return Math.ceil(String(text || '').length / 4);
}

function estimateFilesTokens(files = []) {
  return files.reduce((sum, file) => sum + estimateTokens(`${file.path}\n${file.content || ''}`), 0);
}

function formatEstimatedTokens(tokens = 0) {
  const value = Number(tokens || 0);
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(Math.round(value));
}

function normalizeForScoring(value = '') {
  return String(value || '').toLowerCase();
}

function queryWords(value = '') {
  return [...new Set(normalizeForScoring(value).match(/[a-z0-9_.$/-]{3,}/g) || [])].slice(0, 40);
}

function candidatePaths(base = '') {
  return [
    base,
    ...SOURCE_EXTENSIONS.map((ext) => `${base}${ext}`),
    ...SOURCE_EXTENSIONS.map((ext) => `${base}/index${ext}`),
  ].map(normalizePath);
}

function buildLowercasePathMap(filePathSet) {
  const map = new Map();
  for (const path of filePathSet) {
    const key = normalizePath(path).toLowerCase();
    if (!map.has(key)) map.set(key, path);
  }
  return map;
}

function resolveCandidate(base, filePathSet, lowercasePathMap = null) {
  const candidates = candidatePaths(base);
  const exact = candidates.find((candidate) => filePathSet.has(candidate));
  if (exact) return exact;
  const lowerMap = lowercasePathMap || buildLowercasePathMap(filePathSet);
  for (const candidate of candidates) {
    const insensitive = lowerMap.get(candidate.toLowerCase());
    if (insensitive) return insensitive;
  }
  return null;
}

function resolveRelativeImport(fromPath, importPath, filePathSet, lowercasePathMap = null) {
  const baseDir = dirname(fromPath);
  const rawParts = `${baseDir}/${importPath}`.split('/').filter(Boolean);
  const resolvedParts = [];
  for (const part of rawParts) {
    if (part === '.') continue;
    if (part === '..') resolvedParts.pop();
    else resolvedParts.push(part);
  }
  return resolveCandidate(resolvedParts.join('/'), filePathSet, lowercasePathMap);
}

function resolveAliasImport(importPath, filePathSet, lowercasePathMap = null) {
  const normalized = importPath.replace(/^@\//, 'src/').replace(/^~\//, 'src/');
  return resolveCandidate(normalized, filePathSet, lowercasePathMap) || resolveCandidate(normalized.replace(/^src\//, ''), filePathSet, lowercasePathMap);
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

function sourceSnippet(content = '', importPath = '') {
  const lines = String(content || '').split('\n');
  const index = lines.findIndex((line) => line.includes(importPath));
  if (index < 0) return '';
  return lines.slice(Math.max(0, index - 1), Math.min(lines.length, index + 2)).join('\n').slice(0, 500);
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

function buildCodeRelations(files = []) {
  const filePaths = files.map((file) => normalizePath(file.path)).filter(Boolean);
  const filePathSet = new Set(filePaths);
  const lowercasePathMap = buildLowercasePathMap(filePathSet);
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
        ? resolveRelativeImport(fromPath, importPath, filePathSet, lowercasePathMap)
        : alias
          ? resolveAliasImport(importPath, filePathSet, lowercasePathMap)
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
        from_file: fromPath,
        to_file: resolvedPath,
        relation_type: relationType,
        import_path: importPath,
        package_name: targetKind === 'external_package' ? packageName(importPath) : null,
        target_kind: targetKind,
        confidence: resolvedPath ? 0.9 : targetKind === 'external_package' ? 0.8 : 0.35,
        source_snippet: sourceSnippet(content, importPath),
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

function relatedPathsForChangedFiles(relations = [], changedFiles = []) {
  const changed = new Set(changedFiles.map(normalizePath));
  const related = new Set();
  for (const relation of relations) {
    if (changed.has(relation.from_file) && relation.to_file) related.add(relation.to_file);
    if (relation.to_file && changed.has(relation.to_file)) related.add(relation.from_file);
  }
  return [...related].filter((path) => !changed.has(normalizePath(path)));
}

function summarizeCodeGraph(relations = []) {
  const internal = relations.filter((relation) => relation.target_kind === 'internal_file');
  const external = relations.filter((relation) => relation.target_kind === 'external_package');
  const unresolved = relations.filter((relation) => relation.relation_type === 'unresolved_relative');
  const aliasUnresolved = relations.filter((relation) => relation.relation_type === 'alias_unresolved');
  return {
    totalRelations: relations.length,
    internalRelations: internal.length,
    externalImports: external.length,
    unresolvedRelativeImports: unresolved.length,
    aliasUnresolvedImports: aliasUnresolved.length,
  };
}

const SYMBOL_PATTERNS = [
  { type: 'function', regex: /\bexport\s+async\s+function\s+([A-Za-z_$][\w$]*)\s*\(/g },
  { type: 'function', regex: /\bexport\s+function\s+([A-Za-z_$][\w$]*)\s*\(/g },
  { type: 'function', regex: /\basync\s+function\s+([A-Za-z_$][\w$]*)\s*\(/g },
  { type: 'function', regex: /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g },
  { type: 'class', regex: /\bclass\s+([A-Za-z_$][\w$]*)\b/g },
  { type: 'const', regex: /\bexport\s+const\s+([A-Za-z_$][\w$]*)\s*=/g },
  { type: 'const', regex: /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(?[^=]*?\)?\s*=>/g },
  { type: 'python_function', regex: /^\s*def\s+([A-Za-z_][\w]*)\s*\(/gm },
  { type: 'python_class', regex: /^\s*class\s+([A-Za-z_][\w]*)\s*[(:]/gm },
];

function extractSymbolsFromFile(file = {}) {
  const content = String(file.content || '');
  const symbols = [];
  const seen = new Set();
  if (!content || content.length > 300_000) return [];
  for (const pattern of SYMBOL_PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match;
    while ((match = regex.exec(content)) && symbols.length < 200) {
      const name = match[1];
      if (!name || seen.has(name)) continue;
      seen.add(name);
      symbols.push({ name, type: /^use[A-Z]/.test(name) ? 'hook' : /^[A-Z]/.test(name) && ['function', 'const'].includes(pattern.type) ? 'component' : pattern.type });
    }
  }
  return symbols;
}

function symbolMatchesQuery(symbols = [], questionWords = [], question = '') {
  const haystack = normalizeForScoring(question);
  const matches = [];
  for (const symbol of symbols) {
    const name = normalizeForScoring(symbol.name);
    if (!name) continue;
    const direct = haystack.includes(name);
    const wordHit = questionWords.some((word) => name.includes(word) || word.includes(name));
    if (direct || wordHit) matches.push(symbol);
  }
  return matches.slice(0, 4);
}

function scoreContextFile({ file, questionWords = [], question = '', relatedPaths = [], relations = [] }) {
  const path = file.path || '';
  const content = file.content || '';
  const normalizedPath = normalizeForScoring(path);
  const normalizedContent = normalizeForScoring(content.slice(0, 12000));
  const symbols = extractSymbolsFromFile(file);
  const matchingSymbols = symbolMatchesQuery(symbols, questionWords, question);
  const reasons = [];
  let score = 0;

  if (relatedPaths.includes(path)) {
    score += 70;
    reasons.push('Selected because Code Graph Lite connects it to a direct match.');
  }
  if (normalizeForScoring(question).includes(normalizedPath)) {
    score += 80;
    reasons.push('Selected because the path is mentioned in the question.');
  }
  if (matchingSymbols.length) {
    score += 45 + Math.min(30, matchingSymbols.length * 8);
    reasons.push(`Selected because symbols match the request: ${matchingSymbols.map((symbol) => symbol.name).join(', ')}.`);
  }
  for (const word of questionWords) {
    if (normalizedPath.includes(word)) {
      score += 18;
      reasons.push(`Selected because path matches "${word}".`);
    } else if (normalizedContent.includes(word)) {
      score += 5;
    }
  }
  const imports = relations.filter((relation) => relation.from_file === path).map((relation) => `${relation.import_path || ''} ${relation.to_file || ''}`);
  for (const word of questionWords) {
    if (imports.some((item) => normalizeForScoring(item).includes(word))) {
      score += 12;
      reasons.push(`Selected because imports match "${word}".`);
    }
  }
  if (IMPORTANT_PATH_PATTERNS.some((pattern) => pattern.test(path))) {
    score += 25;
    reasons.push('Selected because it is a high-signal project file or risky domain file.');
  }
  if (LOW_VALUE_PATTERNS.some((pattern) => pattern.test(path))) {
    score -= 40;
    reasons.push('Lower priority because it looks generated, lockfile, snapshot, or low-value output.');
  }
  if (estimateTokens(content) > 4000) {
    score -= 20;
    reasons.push('Lower priority because the file is large.');
  }

  return {
    file,
    score,
    reasons: [...new Set(reasons)].slice(0, 4),
    estimatedTokens: estimateTokens(content),
  };
}

function buildContextPack({ project, files = [], question = '', maxTokens = 12000, depth = 'balanced' }) {
  const preset = DEPTH_PRESETS[depth] || DEPTH_PRESETS.balanced;
  const tokenBudget = Number(maxTokens || preset.maxTokens || 12000);
  const minPositiveFiles = Number(preset.minPositiveFiles || 4);
  const relations = buildCodeRelations(files);
  const questionWords = queryWords(question);

  const directMatches = files
    .filter((file) => {
      const haystack = normalizeForScoring(`${file.path}\n${String(file.content || '').slice(0, 12000)}`);
      return questionWords.some((word) => haystack.includes(word));
    })
    .map((file) => file.path);
  const relatedPaths = relatedPathsForChangedFiles(relations, directMatches);

  const scored = files
    .map((file) => scoreContextFile({ file, questionWords, question, relatedPaths, relations }))
    .sort((a, b) => b.score - a.score);

  const selectedFiles = [];
  const reasons = {};
  const relevanceScores = {};
  let tokens = estimateTokens(project?.summary || '');

  for (const item of scored) {
    if (item.score <= 0 && selectedFiles.length >= minPositiveFiles) continue;
    const nextTokens = tokens + item.estimatedTokens;
    if (selectedFiles.length > 0 && nextTokens > tokenBudget) continue;
    selectedFiles.push(item.file);
    reasons[item.file.path] = item.reasons.length ? item.reasons : ['Selected as part of the compact context pack.'];
    relevanceScores[item.file.path] = item.score;
    tokens = nextTokens;
    if (tokens >= tokenBudget) break;
  }

  if (selectedFiles.length === 0 && files.length > 0) {
    selectedFiles.push(files[0]);
    reasons[files[0].path] = ['Selected as fallback because no stronger relevance signal was detected.'];
    relevanceScores[files[0].path] = 0;
  }

  const selectedPaths = new Set(selectedFiles.map((file) => file.path));
  const selectedRelations = relations.filter((relation) => selectedPaths.has(relation.from_file) || (relation.to_file && selectedPaths.has(relation.to_file)));
  const graphSummary = summarizeCodeGraph(relations);
  const warnings = [];
  if (files.length === 0) warnings.push('No stored files are available for this project.');
  if (graphSummary.unresolvedRelativeImports > 0 || graphSummary.aliasUnresolvedImports > 0) warnings.push('Some imports are unresolved; the imported sample may be incomplete or aliases may need deeper config support.');
  if (selectedFiles.length < files.length) warnings.push('Context was intentionally reduced. The full repository was not sent to AI.');

  const selectedTokens = estimateFilesTokens(selectedFiles) + estimateTokens(project?.summary || '');
  const fullRepoTokens = estimateFilesTokens(files) + estimateTokens(project?.summary || '');
  const savingsPercent = fullRepoTokens > 0 ? Math.max(0, Math.round((1 - selectedTokens / fullRepoTokens) * 100)) : 0;

  return {
    selectedFiles,
    selectedRelations,
    projectSummary: project?.summary || 'No project summary available.',
    graphSummary,
    reasons,
    relevanceScores,
    depth,
    depthPreset: preset.label,
    warnings,
    efficiency: {
      selectedFileCount: selectedFiles.length,
      totalFileCount: files.length,
      selectedTokens,
      fullRepoTokens,
      savingsPercent,
    },
  };
}

function formatContextPackForPrompt(contextPack) {
  const relationLines = contextPack.selectedRelations
    .slice(0, 80)
    .map((relation) => `- ${relation.from_file} ${relation.relation_type} ${relation.import_path}${relation.to_file ? ` -> ${relation.to_file}` : ''}`)
    .join('\n');

  const fileBlocks = contextPack.selectedFiles
    .map((file) => {
      const score = contextPack.relevanceScores?.[file.path];
      const reasonText = (contextPack.reasons[file.path] || []).map((reason) => `// ${reason}`).join('\n');
      const scoreText = Number.isFinite(score) ? `// Relevance score: ${score}\n` : '';
      return `--- ${file.path} ---\n${scoreText}${reasonText}\n${String(file.content || '').slice(0, 8000)}`;
    })
    .join('\n\n');

  return `Project summary:\n${contextPack.projectSummary}\n\nContext depth: ${contextPack.depthPreset || contextPack.depth || 'Balanced'}\n\nSelected relations:\n${relationLines || 'No selected relations.'}\n\nWarnings:\n${contextPack.warnings.map((warning) => `- ${warning}`).join('\n') || '- None'}\n\nSelected files:\n${fileBlocks || 'No files selected.'}`;
}

function llmText(value) {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  try {
    return JSON.stringify(value, null, 2);
  } catch (_) {
    return String(value);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { project_id, user_question, context_depth = 'balanced' } = await req.json();
    if (!project_id || !user_question) {
      return Response.json({ error: 'Missing project_id or user_question' }, { status: 400 });
    }

    const [projects, files] = await Promise.all([
      base44.entities.CodebaseProject.filter({ id: project_id }),
      base44.entities.CodeFile.filter({ project_id }, 'path', 1000),
    ]);

    const project = projects[0];
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

    const preset = DEPTH_PRESETS[context_depth] || DEPTH_PRESETS.balanced;
    const contextPack = buildContextPack({ project, files, question: user_question, maxTokens: preset.maxTokens, depth: context_depth });

    const prompt = `You are Codebase Brain, a senior codebase analyst. Answer using ONLY the compact context pack below.

Rules:
- Be practical and specific.
- Include file paths when useful.
- Mention missing context when needed.
- Do not claim tests were run.
- Do not invent files, routes, APIs, or behavior outside the provided context.

User question:
${user_question}

${formatContextPackForPrompt(contextPack)}`;

    const answer = llmText(await base44.integrations.Core.InvokeLLM({ prompt })) || 'I could not generate a response from the available codebase context.';
    const efficiency = contextPack.efficiency;
    const metadata = `\n\n---\n_Context used: ${efficiency.selectedFileCount}/${efficiency.totalFileCount} files · estimated ${formatEstimatedTokens(efficiency.selectedTokens)} tokens selected vs ${formatEstimatedTokens(efficiency.fullRepoTokens)} full-repo tokens · estimated ${efficiency.savingsPercent}% saved._`;

    return Response.json({
      answer: `${answer}${metadata}`,
      context_pack: {
        selected_files: contextPack.selectedFiles.map((file) => file.path),
        selected_relations_count: contextPack.selectedRelations.length,
        warnings: contextPack.warnings,
        efficiency,
        depth: contextPack.depthPreset,
      },
    });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});
