function safeSlug(value = 'project') {
  return String(value || 'project')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'project';
}

export function buildReportFilename(projectName, reportName, extension) {
  const project = safeSlug(projectName);
  const report = safeSlug(reportName);
  return `${project}-${report}.${extension}`;
}

export function downloadTextReport({ filename, content, mimeType = 'text/plain;charset=utf-8' }) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  const blob = new Blob([String(content || '')], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
  return true;
}

export function downloadMarkdownReport(projectName, reportName, markdown) {
  return downloadTextReport({
    filename: buildReportFilename(projectName, reportName, 'md'),
    content: markdown,
    mimeType: 'text/markdown;charset=utf-8',
  });
}

export function downloadJsonReport(projectName, reportName, data) {
  return downloadTextReport({
    filename: buildReportFilename(projectName, reportName, 'json'),
    content: JSON.stringify(data || {}, null, 2),
    mimeType: 'application/json;charset=utf-8',
  });
}
