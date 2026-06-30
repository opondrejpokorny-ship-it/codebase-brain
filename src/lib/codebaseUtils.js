const LANGUAGE_BY_EXTENSION = {
  js: "JavaScript",
  jsx: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  ts: "TypeScript",
  tsx: "TypeScript",
  py: "Python",
  rb: "Ruby",
  go: "Go",
  rs: "Rust",
  java: "Java",
  kt: "Kotlin",
  php: "PHP",
  css: "CSS",
  scss: "SCSS",
  html: "HTML",
  json: "JSON",
  md: "Markdown",
  yml: "YAML",
  yaml: "YAML",
  sql: "SQL",
  prisma: "Prisma",
  sh: "Shell",
};

export function extractProjectName(url = "") {
  if (!url) return "";
  const cleanUrl = url.trim().replace(/\.git$/, "").replace(/\/$/, "");
  const parts = cleanUrl.split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
}

export function detectLanguageFromPath(path = "") {
  const filename = path.split("/").pop() || "";
  if (filename === "Dockerfile") return "Docker";
  if (filename === "package.json") return "JSON";
  if (filename === "schema.prisma") return "Prisma";
  const ext = filename.includes(".") ? filename.split(".").pop().toLowerCase() : "txt";
  return LANGUAGE_BY_EXTENSION[ext] || ext.toUpperCase();
}

function matchFileMarker(line) {
  const trimmed = line.trim();
  const dashMarker = trimmed.match(/^---\s+(.+?)\s+---$/);
  if (dashMarker) return dashMarker[1].trim();

  const commentMarker = trimmed.match(/^(?:\/\/|#)\s*(?:file|path|filename):\s*(.+?)\s*$/i);
  if (commentMarker) return commentMarker[1].trim();

  const blockMarker = trimmed.match(/^\/\*\s*(?:file|path|filename):\s*(.+?)\s*\*\/\s*$/i);
  if (blockMarker) return blockMarker[1].trim();

  return null;
}

export function parsePastedCode(rawCode = "") {
  const code = rawCode.replace(/\r\n/g, "\n").trim();
  if (!code) return [];

  const lines = code.split("\n");
  const sections = [];
  let current = null;

  for (const line of lines) {
    const markerPath = matchFileMarker(line);
    if (markerPath) {
      if (current) sections.push(current);
      current = { path: markerPath, lines: [] };
      continue;
    }

    if (!current) {
      current = { path: "main.txt", lines: [] };
    }
    current.lines.push(line);
  }

  if (current) sections.push(current);

  return sections
    .map((section) => {
      const content = section.lines.join("\n").trim();
      return {
        path: section.path,
        content,
        language: detectLanguageFromPath(section.path),
        size: content.length,
      };
    })
    .filter((file) => file.content.length > 0);
}

export function detectStackFromFiles(files = [], repoUrl = "") {
  const stack = new Set();
  const paths = files.map((file) => file.path.toLowerCase());
  const combined = `${repoUrl}\n${files.map((file) => `${file.path}\n${file.content.slice(0, 1200)}`).join("\n")}`.toLowerCase();

  if (paths.some((path) => path.endsWith("package.json"))) stack.add("Node.js");
  if (paths.some((path) => path.includes("vite.config")) || combined.includes("\"vite\"")) stack.add("Vite");
  if (paths.some((path) => path.includes("next.config") || path.startsWith("app/")) || combined.includes("\"next\"")) stack.add("Next.js");
  if (combined.includes("from \"react\"") || combined.includes("from 'react'") || combined.includes("\"react\"")) stack.add("React");
  if (combined.includes("typescript") || paths.some((path) => path.endsWith(".ts") || path.endsWith(".tsx") || path === "tsconfig.json")) stack.add("TypeScript");
  if (combined.includes("tailwind") || paths.some((path) => path.includes("tailwind.config"))) stack.add("Tailwind CSS");
  if (combined.includes("@base44/sdk") || paths.some((path) => path.startsWith("base44/"))) stack.add("Base44");
  if (combined.includes("express")) stack.add("Express");
  if (paths.some((path) => path.endsWith(".py")) || combined.includes("fastapi") || combined.includes("django")) stack.add("Python");
  if (combined.includes("fastapi")) stack.add("FastAPI");
  if (combined.includes("django")) stack.add("Django");
  if (paths.some((path) => path.includes("schema.prisma")) || combined.includes("prisma")) stack.add("Prisma");
  if (paths.some((path) => path.includes("dockerfile") || path.includes("docker-compose"))) stack.add("Docker");

  return [...stack];
}

export function createFallbackSummary({ name, repositoryUrl, files = [], detectedStack = [] }) {
  const fileCount = files.length;
  const stack = detectedStack.length ? detectedStack.join(", ") : "no clear stack detected yet";
  const source = repositoryUrl ? `Repository URL: ${repositoryUrl}.` : "Created from pasted code.";
  return `${name || "This project"} is a lightweight codebase project with ${fileCount} stored file${fileCount === 1 ? "" : "s"}. ${source} Detected stack: ${stack}.`;
}

export function selectRelevantFiles(question = "", files = [], limit = 8) {
  const terms = question
    .toLowerCase()
    .split(/[^a-z0-9_./-]+/i)
    .filter((term) => term.length >= 3);

  return [...files]
    .map((file) => {
      const haystack = `${file.path}\n${file.summary || ""}\n${file.content || ""}`.toLowerCase();
      const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
      return { file, score };
    })
    .sort((a, b) => b.score - a.score || (a.file.size || 0) - (b.file.size || 0))
    .slice(0, limit)
    .map((item) => item.file);
}

export function buildCodebaseQuestionPrompt({ project, files = [], question }) {
  const relevantFiles = selectRelevantFiles(question, files, 8);
  const fileContext = relevantFiles
    .map((file) => {
      const content = (file.content || "").slice(0, 2500);
      return `FILE: ${file.path}\nLANGUAGE: ${file.language || "unknown"}\nCONTENT:\n${content}`;
    })
    .join("\n\n---\n\n");

  return `You are Codebase Brain, a careful AI codebase analyst.\n\nRules:\n- Answer only from the provided project context.\n- If the context is incomplete, say exactly what is missing.\n- Mention relevant file paths when possible.\n- Be concise and practical.\n- Do not invent files, functions, APIs, or business logic that are not present in the context.\n\nPROJECT:\nName: ${project?.name || "Unknown"}\nRepository URL: ${project?.repository_url || "Not provided"}\nDetected stack: ${(project?.detected_stack || []).join(", ") || "Unknown"}\nProject summary: ${project?.summary || "Not generated yet"}\n\nAVAILABLE FILES USED FOR CONTEXT:\n${fileContext || "No files were stored for this project yet."}\n\nUSER QUESTION:\n${question}`;
}
