// @ts-nocheck

export const MCP_RESPONSE_EVIDENCE_FIELDS = [
  'used_files',
  'used_relations',
  'missing_context',
  'source_freshness',
];

export function buildMcpResponseEvidence({ usedFiles = [], usedRelations = [], missingContext = [], sourceFreshness = 'unknown' } = {}) {
  return {
    used_files: usedFiles,
    used_relations: usedRelations,
    missing_context: missingContext,
    source_freshness: sourceFreshness,
  };
}

export function attachMcpResponseEvidence(response = {}, evidence = {}) {
  return {
    ...response,
    evidence: buildMcpResponseEvidence(evidence),
  };
}

export function hasMcpResponseEvidence(response = {}) {
  const evidence = response.evidence || {};
  return MCP_RESPONSE_EVIDENCE_FIELDS.every((field) => Object.prototype.hasOwnProperty.call(evidence, field));
}
