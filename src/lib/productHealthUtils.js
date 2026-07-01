export const PRODUCT_HEALTH_SECTIONS = [
  {
    title: 'Stable surfaces',
    tone: 'green',
    items: [
      { label: 'Authenticated app shell', status: 'ready' },
      { label: 'Public repository import', status: 'ready' },
      { label: 'Project detail and analysis pages', status: 'ready' },
      { label: 'Workspace quality reports', status: 'ready' },
    ],
  },
  {
    title: 'Local-first features',
    tone: 'blue',
    items: [
      { label: 'Workspace options', status: 'local-first' },
      { label: 'Quality snapshots', status: 'local-first' },
      { label: 'Saved view preferences', status: 'local-first' },
      { label: 'Draft approvals', status: 'local-first' },
    ],
  },
  {
    title: 'Guarded features',
    tone: 'amber',
    items: [
      { label: 'Review queue', status: 'guarded' },
      { label: 'Tool dispatcher', status: 'guarded' },
      { label: 'Action preview', status: 'guarded' },
      { label: 'Expanded import access', status: 'not-enabled' },
    ],
  },
  {
    title: 'Next hardening targets',
    tone: 'slate',
    items: [
      { label: 'Import run history', status: 'next' },
      { label: 'Shared route registry', status: 'next' },
      { label: 'Shared quality utilities', status: 'next' },
      { label: 'Graph and symbol storage', status: 'next' },
    ],
  },
];

export function summarizeProductHealth(sections = PRODUCT_HEALTH_SECTIONS) {
  const items = sections.flatMap((section) => section.items);
  const counts = items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});
  return {
    total: items.length,
    ready: counts.ready || 0,
    localFirst: counts['local-first'] || 0,
    guarded: counts.guarded || 0,
    next: counts.next || 0,
  };
}

export function healthToneClasses(tone = 'slate') {
  const tones = {
    green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    slate: 'border-slate-200 bg-slate-50 text-slate-800',
  };
  return tones[tone] || tones.slate;
}
