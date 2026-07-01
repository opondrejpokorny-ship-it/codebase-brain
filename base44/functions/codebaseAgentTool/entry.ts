import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization, x-requested-with',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

async function readJson(request) {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? body : {};
  } catch (_) {
    return {};
  }
}

function text(value = '') {
  return String(value || '').toLowerCase();
}

function words(value = '') {
  return [...new Set(text(value).match(/[a-z0-9_.$/-]{2,}/g) || [])].slice(0, 30);
}

function pathOf(file) {
  return String(file?.path || '').replace(/^\.\//, '').replace(/\/+/g, '/');
}

function snippets(content = '', queryWords = []) {
  const lines = String(content || '').split('\n');
  const out = [];
  for (let i = 0; i < lines.length && out.length < 3; i += 1) {
    const line = text(lines[i]);
    if (queryWords.some((word) => line.includes(word))) {
      out.push({ line: i + 1, text: lines.slice(Math.max(0, i - 1), i + 2).join('\n').slice(0, 700) });
    }
  }
  return out;
}

function symbols(content = '') {
  const result = [];
  const patterns = [
    /function\s+([A-Za-z0-9_$]+)/g,
    /class\s+([A-Za-z0-9_$]+)/g,
    /export\s+const\s+([A-Za-z0-9_$]+)/g,
    /const\s+([A-Z][A-Za-z0-9_$]+)\s*=/g,
    /def\s+([A-Za-z0-9_]+)\s*\(/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) && result.length < 120) result.push(match[1]);
  }
  return [...new Set(result)];
}

function imports(content = '') {
  const result = [];
  const patterns = [
    /from\s+["']([^"']+)["']/g,
    /import\s+["']([^"']+)["']/g,
    /require\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) && result.length < 160) result.push(match[1]);
  }
  return [...new Set(result)];
}

function scoreFile(file, query = '') {
  const queryWords = words(query);
  const p = pathOf(file);
  const body = String(file?.content || '');
  const haystack = text(`${p}\n${body.slice(0, 20000)}`);
  const fileSymbols = symbols(body);
  const fileImports = imports(body);
  let score = 0;
  const reasons = [];
  for (const word of queryWords) {
    if (text(p).includes(word)) { score += 40; reasons.push(`path:${word}`); }
    if (haystack.includes(word)) { score += 10; reasons.push(`content:${word}`); }
    if (fileSymbols.some((item) => text(item).includes(word))) { score += 25; reasons.push(`symbol:${word}`); }
    if (fileImports.some((item) => text(item).includes(word))) { score += 15; reasons.push(`import:${word}`); }
  }
  if (/auth|payment|webhook|schema|route|base44\/functions/i.test(p)) score += 8;
  return { score, reasons: [...new Set(reasons)].slice(0, 8), symbols: fileSymbols, imports: fileImports };
}

function searchFiles(files = [], query = '', limit = 10) {
  return files
    .map((file) => ({ file, ...scoreFile(file, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => ({
      path: pathOf(item.file),
      language: item.file.language || 'unknown',
      score: item.score,
      reasons: item.reasons,
      symbols: item.symbols.slice(0, 20),
      imports: item.imports.slice(0, 20),
      snippets: snippets(item.file.content || '', words(query)),
    }));
}

function architecture(project, files = []) {
  const paths = files.map(pathOf).filter(Boolean);
  const allImports = files.flatMap((file) => imports(file.content || ''));
  return {
    project: {
      id: project.id,
      name: project.name,
      repository_url: project.repository_url,
      detected_stack: project.detected_stack || [],
      status: project.status,
    },
    counts: { files: files.length, imports: allImports.length },
    frontend_files: paths.filter((p) => /src\/pages|src\/components|app\/|pages\//i.test(p)).slice(0, 40),
    backend_files: paths.filter((p) => /api|server|base44\/functions|routes|controllers/i.test(p)).slice(0, 40),
    high_risk_files: paths.filter((p) => /auth|payment|refund|credit|admin|webhook|delete|schema|migration/i.test(p)).slice(0, 60),
    external_imports: [...new Set(allImports.filter((item) => item && !item.startsWith('.') && !item.startsWith('@/') && !item.startsWith('~/')))].slice(0, 80),
  };
}

async function load(base44, projectId) {
  const [projects, files] = await Promise.all([
    base44.entities.CodebaseProject.filter({ id: projectId }).catch(() => []),
    base44.entities.CodeFile.filter({ project_id: projectId }, 'path', 1000).catch(() => []),
  ]);
  return { project: projects[0] || null, files };
}

async function dispatch(base44, body) {
  const tool = body.tool || body.name;
  const input = body.input || body;
  const projectId = input.project_id || input.projectId;
  if (!tool) return { error: 'Missing tool name' };
  if (!projectId) return { error: 'Missing project_id' };
  const { project, files } = await load(base44, projectId);
  if (!project) return { error: 'Project not found' };

  if (tool === 'search_codebase') {
    return { tool, project_id: projectId, results: searchFiles(files, input.query || '', Number(input.limit || 10)) };
  }
  if (tool === 'explain_file') {
    const wanted = pathOf({ path: input.path });
    const file = files.find((item) => pathOf(item) === wanted);
    if (!file) return { tool, error: 'File not found', path: wanted };
    return { tool, project_id: projectId, path: pathOf(file), language: file.language, symbols: symbols(file.content || ''), imports: imports(file.content || ''), preview: String(file.content || '').slice(0, 2500) };
  }
  if (tool === 'get_architecture') {
    return { tool, project_id: projectId, architecture: architecture(project, files) };
  }
  if (tool === 'suggest_tests') {
    const changed = Array.isArray(input.changed_files) ? input.changed_files.join(' ') : String(input.changed_files || '');
    return { tool, project_id: projectId, tests_run: false, suggested_context: searchFiles(files, `${changed} test spec cypress playwright vitest jest`, 15) };
  }
  return { error: `Unsupported tool: ${tool}` };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const base44 = createClientFromRequest(request);
    const user = await base44.auth.me();
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const result = await dispatch(base44, await readJson(request));
    return json({ ...result, github_writes_enabled: false, dispatcher: 'codebaseAgentTool' }, result.error ? 400 : 200);
  } catch (error) {
    return json({ error: error?.message || String(error), dispatcher: 'codebaseAgentTool' }, 500);
  }
});
