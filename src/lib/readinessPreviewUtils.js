export function buildReadinessRows({ approved = false, identified = false, repositoryOk = true, finalStepAvailable = false, label = '' } = {}) {
  return [
    {
      id: 'approved',
      label: 'Approved draft exists',
      ok: Boolean(approved),
      detail: approved ? 'Saved locally.' : 'Save approval first.',
    },
    {
      id: 'identified',
      label: 'Pull request is identified',
      ok: Boolean(identified),
      detail: label || (identified ? 'Metadata is available.' : 'Missing metadata.'),
    },
    {
      id: 'repository_ok',
      label: 'Repository match is acceptable',
      ok: Boolean(repositoryOk),
      detail: repositoryOk ? 'No mismatch warning.' : 'Resolve mismatch first.',
    },
    {
      id: 'final_step',
      label: 'Final step is available',
      ok: Boolean(finalStepAvailable),
      detail: finalStepAvailable ? 'Available.' : 'Not available in this phase. Preview only.',
    },
  ];
}

export function summarizeReadiness(rows = []) {
  const blockers = rows.filter((row) => !row.ok);
  return {
    ready: blockers.length === 0,
    blockerCount: blockers.length,
    blockers,
  };
}
