export const AGENT_BRIDGE_TOOLS = [
  {
    name: 'search_codebase',
    description: 'Find relevant stored files for a project query.',
    input: ['project_id', 'query', 'limit'],
    output: ['path', 'language', 'score', 'reasons', 'snippets'],
  },
  {
    name: 'explain_file',
    description: 'Return symbols, imports, and a preview for one stored file.',
    input: ['project_id', 'path'],
    output: ['path', 'language', 'symbols', 'imports', 'preview'],
  },
  {
    name: 'get_architecture',
    description: 'Return deterministic architecture hints for a project.',
    input: ['project_id'],
    output: ['project', 'counts', 'frontend_files', 'backend_files', 'high_risk_files'],
  },
  {
    name: 'suggest_tests',
    description: 'Find test-related context for a list of changed files.',
    input: ['project_id', 'changed_files'],
    output: ['tests_run', 'suggested_context'],
  },
];

export function buildAgentBridgeManifest() {
  return {
    name: 'Codebase Brain Agent Bridge',
    version: 'v1',
    mode: 'read_only',
    tools: AGENT_BRIDGE_TOOLS,
  };
}
