import { base44 } from "@/api/base44Client";
import { fetchPublicGithubPrDiffClient } from "@/lib/githubPrUtils";
export { optionalEntity } from "@/lib/optionalEntityRuntime";

export const exampleImpactDiff = `diff --git a/src/lib/contextPackBuilder.js b/src/lib/contextPackBuilder.js
--- a/src/lib/contextPackBuilder.js
+++ b/src/lib/contextPackBuilder.js
@@ -1,5 +1,8 @@
 export function buildContextPack(input) {
+  // prefer graph-confirmed related files before keyword matches
   return selectCompactContext(input);
 }

src/pages/ImpactAnalysis.jsx`;

export function fallbackProjectFromFiles(projectId, storedFiles = []) {
  if (!storedFiles.length) return null;
  return {
    id: projectId,
    name: "Stored project context",
    status: "indexed",
    repository_url: null,
    detected_stack: [],
    summary: "Project metadata was not found, but stored files exist. Using available code context for impact analysis.",
    metadata_missing: true,
  };
}

export async function fetchPublicGithubPrDiffWithFallback(prUrl) {
  try {
    const response = await base44.functions.invoke("fetchPublicGithubPrDiff", { pr_url: prUrl });
    const data = response?.data || response;
    if (data?.error) throw new Error(data.error);
    if (data?.diff) return data;
    throw new Error("Backend PR fetch returned an unexpected response.");
  } catch (backendError) {
    const fallback = await fetchPublicGithubPrDiffClient(prUrl);
    return {
      ...fallback,
      source: "client_fallback_after_backend_error",
      backendError: backendError?.message || String(backendError),
    };
  }
}
