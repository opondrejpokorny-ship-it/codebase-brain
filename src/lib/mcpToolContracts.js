// MCP/API tool contract definitions for future Codebase Brain agent integrations.
// These are metadata-only contracts. They do not execute tools directly.

export const CODEBASE_BRAIN_AGENT_TOOLS = [
  {
    name: 'search_codebase',
    phase: 'mcp_v1',
    description: 'Search stored codebase context by meaning, path, symbols, imports, and risk-domain words.',
    input_schema: {
      type: 'object',
      required: ['project_id', 'query'],
      properties: {
        project_id: { type: 'string' },
        query: { type: 'string' },
        limit: { type: 'number', default: 10 },
      },
    },
    safety: { github_writes: false, reads_private_code_only_after_project_import: true },
  },
  {
    name: 'explain_file',
    phase: 'mcp_v1',
    description: 'Explain one stored file with its symbols, imports, inbound/outbound graph relations, and missing context warnings.',
    input_schema: {
      type: 'object',
      required: ['project_id', 'path'],
      properties: {
        project_id: { type: 'string' },
        path: { type: 'string' },
      },
    },
    safety: { github_writes: false },
  },
  {
    name: 'get_architecture',
    phase: 'mcp_v1',
    description: 'Return deterministic architecture facts from stored files, relations, symbols, stack hints, integrations, and high-risk areas.',
    input_schema: {
      type: 'object',
      required: ['project_id'],
      properties: { project_id: { type: 'string' } },
    },
    safety: { github_writes: false, llm_required: false },
  },
  {
    name: 'impact_analysis',
    phase: 'mcp_v1',
    description: 'Analyze a diff, PR URL, or changed file list against a compact context pack and project risk memory.',
    input_schema: {
      type: 'object',
      required: ['project_id'],
      properties: {
        project_id: { type: 'string' },
        diff_or_changed_files: { type: 'string' },
        pr_url: { type: 'string' },
        context_depth: { type: 'string', enum: ['minimal', 'balanced', 'deep'], default: 'balanced' },
      },
    },
    safety: { github_writes: false, tests_run: false },
  },
  {
    name: 'resolve_missing_context',
    phase: 'mcp_v1',
    description: 'Target-import missing files from the project repository and rebuild lightweight graph relations.',
    input_schema: {
      type: 'object',
      required: ['project_id', 'targets'],
      properties: {
        project_id: { type: 'string' },
        targets: { type: 'array', items: { type: 'string' } },
      },
    },
    safety: { github_writes: false, targeted_import_only: true },
  },
  {
    name: 'suggest_tests',
    phase: 'mcp_v1',
    description: 'Suggest tests for changed files using graph-connected files, symbols, risk memory, and active project rules.',
    input_schema: {
      type: 'object',
      required: ['project_id', 'changed_files'],
      properties: {
        project_id: { type: 'string' },
        changed_files: { type: 'array', items: { type: 'string' } },
      },
    },
    safety: { github_writes: false, tests_run: false },
  },
  {
    name: 'get_project_rules',
    phase: 'mcp_v1',
    description: 'Return active project rules and ADR-style memory for an agent review.',
    input_schema: {
      type: 'object',
      required: ['project_id'],
      properties: { project_id: { type: 'string' } },
    },
    safety: { github_writes: false },
  },
  {
    name: 'add_project_rule',
    phase: 'mcp_v1_later_write',
    description: 'Add a user-approved project rule or ADR entry. This must remain an explicit user-approved write.',
    input_schema: {
      type: 'object',
      required: ['project_id', 'title', 'description'],
      properties: {
        project_id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        category: { type: 'string', default: 'general' },
        severity: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' },
      },
    },
    safety: { github_writes: false, requires_user_approval: true },
  },
];

export function agentToolContractByName(name) {
  return CODEBASE_BRAIN_AGENT_TOOLS.find((tool) => tool.name === name) || null;
}

export function formatAgentToolContractsMarkdown(tools = CODEBASE_BRAIN_AGENT_TOOLS) {
  return tools.map((tool) => `### ${tool.name}\n${tool.description}\n\nPhase: ${tool.phase}\n\nSafety: ${Object.entries(tool.safety || {}).map(([key, value]) => `${key}=${value}`).join(', ') || 'none'}`).join('\n\n');
}
