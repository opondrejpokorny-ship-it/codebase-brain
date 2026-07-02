// @ts-nocheck
import { MCP_LITE_TOOLS } from '@/lib/mcpLiteTools';
import { MCP_RESPONSE_EVIDENCE_FIELDS } from '@/lib/mcpResponseEvidenceUtils';

export const MCP_READ_ONLY_TOOL_NAMES = [
  'search_codebase',
  'explain_file',
  'get_context_pack',
  'get_architecture',
  'read_decisions',
];

export function isReadOnlyMcpTool(toolName = '') {
  return MCP_READ_ONLY_TOOL_NAMES.includes(toolName);
}

export function getReadOnlyMcpTools(tools = MCP_LITE_TOOLS) {
  return tools.filter((tool) => isReadOnlyMcpTool(tool.name));
}

export function buildReadOnlyMcpToolSummary(tools = MCP_LITE_TOOLS) {
  return getReadOnlyMcpTools(tools).map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    outputEvidenceRequired: MCP_RESPONSE_EVIDENCE_FIELDS,
  }));
}
