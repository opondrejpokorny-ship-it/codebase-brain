export function estimateTokensFromText(text) {
  return Math.ceil(String(text || "").length / 4);
}

export function estimateFilesTokens(files = []) {
  return files.reduce((sum, file) => sum + estimateTokensFromText(file?.content || ""), 0);
}

export function buildContextEfficiencyReport({ allFiles = [], selectedFiles = [], extraContextText = "" } = {}) {
  const fullRepoTokens = estimateFilesTokens(allFiles);
  const selectedTokens = estimateFilesTokens(selectedFiles) + estimateTokensFromText(extraContextText);
  const savedTokens = Math.max(0, fullRepoTokens - selectedTokens);
  const savingsPercent = fullRepoTokens > 0
    ? Math.round((savedTokens / fullRepoTokens) * 100)
    : 0;

  return {
    fullRepoTokens,
    selectedTokens,
    savedTokens,
    savingsPercent,
    selectedFileCount: selectedFiles.length,
    totalFileCount: allFiles.length,
  };
}

export function formatEstimatedTokens(value) {
  const n = Number(value || 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
