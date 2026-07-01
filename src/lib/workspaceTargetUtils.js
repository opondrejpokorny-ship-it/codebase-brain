export function normalizeQualityTarget(value, fallback = 70) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(100, Math.round(number)));
}

export function summarizeWorkspaceTarget(average = 0, target = 70) {
  const normalizedAverage = normalizeQualityTarget(average, 0);
  const normalizedTarget = normalizeQualityTarget(target);
  const delta = normalizedAverage - normalizedTarget;
  return {
    target: normalizedTarget,
    average: normalizedAverage,
    delta,
    met: delta >= 0,
    label: delta >= 0 ? `${delta} pts above target` : `${Math.abs(delta)} pts below target`,
  };
}
