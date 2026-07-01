export const MCP_LITE_TOOLS = [
  {
    name: "search_codebase",
    description: "Search stored files, symbols, imports, and product areas using deterministic Codebase Brain context.",
    inputSchema: { query: "string", project_id: "string", limit: "number?" },
  },
  {
    name: "explain_file",
    description: "Explain one stored file with relation, symbol, risk, and product-area evidence.",
    inputSchema: { project_id: "string", file_path: "string" },
  },
  {
    name: "get_context_pack",
    description: "Build a compact context pack for a question, changed file list, or diff.",
    inputSchema: { project_id: "string", question: "string", changed_files: "string[]?", diff_text: "string?", depth: "brief|balanced|deep?" },
  },
  {
    name: "impact_analysis",
    description: "Analyze a submitted diff or PR patch against stored codebase context and return risk, verdict, tests, and missing context.",
    inputSchema: { project_id: "string", diff_text: "string", pr_url: "string?", depth: "brief|balanced|deep?" },
  },
  {
    name: "suggest_tests",
    description: "Suggest unit, integration, manual, and regression tests for a changed file list or diff.",
    inputSchema: { project_id: "string", changed_files: "string[]", diff_text: "string?" },
  },
  {
    name: "get_architecture",
    description: "Return deterministic architecture facts, product areas, graph stats, and missing-context warnings.",
    inputSchema: { project_id: "string" },
  },
  {
    name: "read_decisions",
    description: "Read ADR-style project decisions and risk-memory notes relevant to files or product areas.",
    inputSchema: { project_id: "string", files: "string[]?", tags: "string[]?" },
  },
];

export function getMcpLiteToolManifest() {
  return {
    name: "codebase-brain",
    version: "mcp-lite-contract-v1",
    description: "Product-level codebase memory tools for Codebase Brain. This manifest documents the future MCP server contract; it is not a running server by itself.",
    tools: MCP_LITE_TOOLS,
  };
}

export function formatMcpLiteToolsMarkdown(tools = MCP_LITE_TOOLS) {
  return tools.map((tool) => `### ${tool.name}\n\n${tool.description}\n\nInput: \`${JSON.stringify(tool.inputSchema)}\``).join("\n\n");
}

export function buildMcpConfigSnippet({ command = "codebase-brain-mcp", projectId = "PROJECT_ID", baseUrl = "https://your-app.base44.app", target = "generic" } = {}) {
  const env = {
    CODEBASE_BRAIN_PROJECT_ID: projectId,
    CODEBASE_BRAIN_BASE_URL: baseUrl,
  };

  if (target === "codex") {
    return `[mcp_servers.codebase-brain]\ncommand = "${command}"\nargs = ["serve"]\nenv = ${JSON.stringify(env)}`;
  }

  const config = {
    mcpServers: {
      "codebase-brain": {
        command,
        args: ["serve"],
        env,
      },
    },
  };

  return JSON.stringify(config, null, 2);
}

export function buildAgentSetupChecklist() {
  return [
    "Deploy a backend MCP endpoint or local bridge process.",
    "Keep private repository tokens backend-only.",
    "Expose read-only tools first: search_codebase, explain_file, get_context_pack, get_architecture, read_decisions.",
    "Gate impact_analysis behind explicit user request because it invokes an LLM.",
    "Do not enable GitHub comments, approvals, merges, or commits in the first MCP version.",
    "Show the same context-pack evidence in the web UI and MCP response.",
  ];
}
