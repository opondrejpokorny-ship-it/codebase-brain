function scoreFilesByPatterns(files = [], patterns = [], weight = 20) {
  return files
    .map((file) => {
      const path = String(file.path || "");
      const score = patterns.reduce((sum, pattern, index) => sum + (pattern.test(path) ? weight - index : 0), 0);
      return { file, score };
    })
    .sort((a, b) => b.score - a.score);
}

export function pickDefaultProjectContextFiles(files = []) {
  const priorityPatterns = [
    /package\.json$/i,
    /src\/app\./i,
    /src\/main\./i,
    /src\/pages\//i,
    /src\/routes\//i,
    /src\/api\//i,
    /base44\/functions\//i,
    /schema/i,
    /auth/i,
    /payment|billing|webhook/i,
  ];

  return scoreFilesByPatterns(files, priorityPatterns, 20)
    .slice(0, Math.min(8, Math.max(1, files.length)))
    .map((item) => item.file);
}

export function pickImpactBaselineContextFiles(files = []) {
  const priorityPatterns = [
    /package\.json$/i,
    /src\/api\//i,
    /base44\/functions\//i,
    /server|function|webhook/i,
    /auth|login|session|permission|role/i,
    /payment|checkout|refund|credit|billing|subscription/i,
    /schema|migration|database|db/i,
    /src\/pages\//i,
    /src\/components\//i,
  ];

  return scoreFilesByPatterns(files, priorityPatterns, 30)
    .slice(0, Math.min(10, Math.max(1, files.length)))
    .map((item) => item.file);
}
