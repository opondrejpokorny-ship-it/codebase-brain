// @ts-nocheck

export function stableObjectKey(value) {
  if (value == null) return '';
  if (typeof value !== 'object') return String(value);
  if (Array.isArray(value)) return `[${value.map(stableObjectKey).join(',')}]`;
  return Object.keys(value)
    .sort()
    .map((key) => `${key}:${stableObjectKey(value[key])}`)
    .join('|');
}
