function normalize(value = "") {
  return String(value || "").toLowerCase().replace(/[^a-z0-9_./-]+/g, " ").trim();
}

function basename(path = "") {
  return String(path || "").split("/").pop() || "";
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function extractChangedFiles(changeInput = "") {
  const text = String(changeInput || "");
  const files = [];

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const diffGit = trimmed.match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (diffGit) {
      files.push(diffGit[1], diffGit[2]);
      continue;
    }

    const plusFile = trimmed.match(/^\+\+\+ b\/(.+)$/);
    if (plusFile && plusFile[1] !== "/dev/null") {
      files.push(plusFile[1]);
      continue;
    }

    const minusFile = trimmed.match(/^--- a\/(.+)$/);
    if (minusFile && minusFile[1] !== "/dev/null") {
      files.push(minusFile[1]);
      continue;
    }

    // Also support manual file lists such as "src/api/payments.ts".
    if (/^[\w./@-]+\.(js|jsx|ts|tsx|py|rb|go|rs|java|kt|php|json|md|yml|yaml|sql|prisma|css|scss|html)$/i.test(trimmed)) {
      files.push(trimmed.replace(/^a\//, "").replace(/^b\//, ""));
    }
  }

  return unique(files).slice(0, 80);
}

export function heuristicRiskSignals(changeInput = "", changedFiles = []) {
  const text = normalize(`${changeInput}\n${changedFiles.join("\n")}`);
  const signals = [];

  const checks = [
    { key: "payments", label: "Payment or billing flow", pattern: /payment|billing|checkout|invoice|stripe|comgate|credit|membership|subscription/ },
    { key: "auth", label: "Authentication or authorization", pattern: /auth|login|logout|session|jwt|token|permission|role|admin|protectedroute/ },
    { key: "database", label: "Database schema or persistence", pattern: /prisma|schema|migration|model|entity|database|db\b|sql|storage/ },
    { key: "api", label: "API or backend function", pattern: /api|route|endpoint|webhook|function|server|backend/ },
    { key: "env", label: "Environment or secrets", pattern: /\.env|secret|api_key|apikey|token|credential|process\.env|deno\.env/ },
    { key: "routing", label: "Routing or navigation", pattern: /router|route|navigate|redirect|pathname|app\.jsx|layout/ },
    { key: "state", label: "Shared state or cache", pattern: /context|provider|store|cache|queryclient|zustand|redux|state/ },
    { key: "tests", label: "Tests changed", pattern: /test|spec|__tests__|jest|vitest|playwright|cypress/ },
  ];

  for (const check of checks) {
    if (check.pattern.test(text)) signals.push(check.label);
  }

  return signals;
}

export function initialRiskLevel(changeInput = "", changedFiles = []) {
  const signals = heuristicRiskSignals(changeInput, changedFiles);
  const highSignals = signals.filter((signal) => /Payment|Authentication|Database|Environment/.test(signal));
  if (highSignals.length >= 2) return "high";
  if (highSignals.length === 1 || signals.length >= 3) return "medium";
  if (changedFiles.length >= 12) return "medium";
  return "low";
}

function scoreStoredFile(file, changedFiles, changeInput) {
  const path = file.path || "";
  const normalizedPath = normalize(path);
  const normalizedBase = normalize(basename(path));
  const input = normalize(changeInput);
  let score = 0;

  for (const changed of changedFiles) {
    const changedNorm = normalize(changed);
    const changedBase = normalize(basename(changed));
    if (!changedNorm) continue;
    if (normalizedPath === changedNorm) score += 100;
    if (normalizedPath.includes(changedNorm) || changedNorm.includes(normalizedPath)) score += 50;
    if (changedBase && normalizedBase === changedBase) score += 35;
    if (changedBase && input.includes(changedBase)) score += 10;
  }

  const contentPreview = normalize(`${file.summary || ""}\n${file.content || ""}`.slice(0, 5000));
  const highValueTerms = ["payment", "auth", "route", "api", "webhook", "entity", "schema", "membership", "credit", "booking", "user", "admin", "config"];
  for (const term of highValueTerms) {
    if (normalizedPath.includes(term)) score += 12;
    if (contentPreview.includes(term)) score += 3;
    if (input.includes(term) && (normalizedPath.includes(term) || contentPreview.includes(term))) score += 18;
  }

  return score;
}

export function selectRelevantFilesForImpact(files = [], changedFiles = [], changeInput = "", limit = 10) {
  return [...files]
    .map((file) => ({ file, score: scoreStoredFile(file, changedFiles, changeInput) }))
    .sort((a, b) => b.score - a.score || (a.file.size || 0) - (b.file.size || 0))
    .filter((entry, index) => entry.score > 0 || index < 4)
    .slice(0, limit)
    .map((entry) => entry.file);
}

export function buildImpactAnalysisPrompt({ project, files = [], changeInput = "" }) {
  const changedFiles = extractChangedFiles(changeInput);
  const heuristicRisk = initialRiskLevel(changeInput, changedFiles);
  const signals = heuristicRiskSignals(changeInput, changedFiles);
  const relevantFiles = selectRelevantFilesForImpact(files, changedFiles, changeInput, 10);

  const context = relevantFiles
    .map((file) => {
      const content = String(file.content || "").slice(0, 2200);
      return `FILE: ${file.path}\nLANGUAGE: ${file.language || "unknown"}\nSUMMARY: ${file.summary || ""}\nCONTENT PREVIEW:\n${content}`;
    })
    .join("\n\n---\n\n");

  return {
    changedFiles,
    heuristicRisk,
    signals,
    relevantFiles,
    prompt: `You are Codebase Brain, a careful senior engineer reviewing a manual PR/diff impact analysis.\n\nRules:\n- Answer only from the provided project context, stored files, and submitted diff/change list.\n- If context is incomplete, clearly say what is missing.\n- Do not claim you ran tests.\n- Prefer concrete file paths and specific risks.\n- Keep the answer practical and concise.\n\nReturn Markdown with exactly these sections:\n1. Summary\n2. Risk level\n3. Affected files / flows\n4. Main risks\n5. Recommended tests\n6. Questions before merge\n7. Missing context\n\nRisk level must be one of: low, medium, high.\n\nPROJECT:\nName: ${project?.name || "Unknown"}\nRepository URL: ${project?.repository_url || "Not provided"}\nDetected stack: ${(project?.detected_stack || []).join(", ") || "Unknown"}\nProject summary: ${project?.summary || "Not available"}\n\nHEURISTIC PRE-SCAN:\nChanged files detected: ${changedFiles.length ? changedFiles.join(", ") : "None detected from input"}\nInitial heuristic risk: ${heuristicRisk}\nRisk signals: ${signals.length ? signals.join(", ") : "None"}\n\nRELEVANT STORED FILE CONTEXT:\n${context || "No stored code files are available for this project."}\n\nSUBMITTED DIFF OR CHANGE LIST:\n${String(changeInput || "").slice(0, 15000)}`,
  };
}

export function extractRiskLevelFromAnalysis(text = "", fallback = "medium") {
  const normalized = normalize(text);
  const explicit = normalized.match(/risk level\s*[:\-]?\s*(low|medium|high)/i);
  if (explicit) return explicit[1].toLowerCase();
  if (/\bhigh\b/.test(normalized)) return "high";
  if (/\bmedium\b/.test(normalized)) return "medium";
  if (/\blow\b/.test(normalized)) return "low";
  return fallback;
}
