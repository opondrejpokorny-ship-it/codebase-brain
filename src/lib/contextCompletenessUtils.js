const CATEGORY_RULES = [
  { key: 'entrypoints', label: 'Entrypoints', patterns: [/^src\/main\./, /^src\/App\./, /^app\//, /^pages\//] },
  { key: 'ui', label: 'UI components', patterns: [/components\//, /\.jsx$/, /\.tsx$/] },
  { key: 'backend', label: 'Backend logic', patterns: [/base44\/functions\//, /server\//, /api\//, /routes\//] },
  { key: 'data', label: 'Data model', patterns: [/schema/i, /model/i, /entities/i, /prisma\//] },
  { key: 'tests', label: 'Tests', patterns: [/test/i, /spec/i, /__tests__\//] },
  { key: 'docs', label: 'Docs', patterns: [/^readme/i, /^docs\//, /\.md$/] },
  { key: 'config', label: 'Config', patterns: [/package\.json$/, /vite\.config/, /tailwind\.config/, /tsconfig/, /jsconfig/] },
];

function pathOf(file = {}) {
  return String(file.path || '').replace(/^\.\//, '');
}

function matchesCategory(path, category) {
  return category.patterns.some((pattern) => pattern.test(path));
}

export function buildContextCompletenessReport(files = []) {
  const paths = files.map(pathOf).filter(Boolean);
  const categories = CATEGORY_RULES.map((category) => {
    const matches = paths.filter((path) => matchesCategory(path, category));
    return {
      key: category.key,
      label: category.label,
      count: matches.length,
      sample: matches.slice(0, 5),
      present: matches.length > 0,
    };
  });
  const present = categories.filter((category) => category.present).length;
  return {
    total_files: paths.length,
    categories,
    score: Math.round((present / CATEGORY_RULES.length) * 100),
    missing: categories.filter((category) => !category.present),
  };
}
