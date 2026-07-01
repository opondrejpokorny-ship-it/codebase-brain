export const ACCESS_READINESS_CHECKS = [
  { key: 'permission_prompt', label: 'User-facing permission explanation', required: true, ready: false },
  { key: 'scope_summary', label: 'Clear scope summary', required: true, ready: false },
  { key: 'audit_record', label: 'Import audit record', required: true, ready: false },
  { key: 'safe_file_filters', label: 'Safe file filters', required: true, ready: true },
  { key: 'token_boundary', label: 'Server-side secret boundary', required: true, ready: false },
  { key: 'revocation_notes', label: 'Revocation and reset notes', required: true, ready: false },
];

export function summarizeAccessReadiness(checks = ACCESS_READINESS_CHECKS) {
  const required = checks.filter((check) => check.required);
  const ready = required.filter((check) => check.ready);
  return {
    ready: ready.length,
    required: required.length,
    complete: ready.length === required.length,
    missing: required.filter((check) => !check.ready),
  };
}
