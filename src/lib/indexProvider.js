import { base44 } from "@/api/base44Client";
import { buildCodeRelations, relatedPathsForChangedFiles } from "@/lib/codeGraphUtils";
import { searchCodebase } from "@/lib/codeSearchUtils";
import { buildContextPack } from "@/lib/contextPackBuilder";
import { buildArchitectureFacts } from "@/lib/architectureUtils";

export const INDEX_PROVIDER = {
  BASE44_LIGHT_INDEX: "base44_light_index",
  LOCAL_ENGINE: "local_engine_later",
  GITHUB_APP_INDEX: "github_app_index_later",
};

async function loadBase44LightIndex(projectId) {
  const [projects, files, relations] = await Promise.all([
    base44.entities.CodebaseProject.filter({ id: projectId }),
    base44.entities.CodeFile.filter({ project_id: projectId }),
    base44.entities.CodeRelation?.filter
      ? base44.entities.CodeRelation.filter({ project_id: projectId }, "created_date", 1000).catch(() => [])
      : Promise.resolve([]),
  ]);

  const storedFiles = files || [];
  const storedRelations = relations?.length ? relations : buildCodeRelations(storedFiles);

  return {
    provider: INDEX_PROVIDER.BASE44_LIGHT_INDEX,
    project: projects?.[0] || null,
    files: storedFiles,
    relations: storedRelations,
  };
}

export async function getProjectIndex(projectId, provider = INDEX_PROVIDER.BASE44_LIGHT_INDEX) {
  if (provider !== INDEX_PROVIDER.BASE44_LIGHT_INDEX) {
    return {
      provider,
      project: null,
      files: [],
      relations: [],
      warning: "This index provider is reserved for a later phase.",
    };
  }

  return loadBase44LightIndex(projectId);
}

export async function searchIndex(projectId, query, options = {}) {
  const index = await getProjectIndex(projectId, options.provider);
  return searchCodebase({
    query,
    files: index.files,
    relations: index.relations,
    limit: options.limit || 10,
  });
}

export async function getRelatedFiles(projectId, paths = [], options = {}) {
  const index = await getProjectIndex(projectId, options.provider);
  const relatedPaths = relatedPathsForChangedFiles(index.relations, paths);
  return index.files.filter((file) => relatedPaths.includes(file.path));
}

export async function getImpact(projectId, diffText = "", options = {}) {
  const index = await getProjectIndex(projectId, options.provider);
  return buildContextPack({
    project: index.project,
    files: index.files,
    relations: index.relations,
    question: diffText,
    changedFiles: options.changedFiles || [],
    diffText,
    maxTokens: options.maxTokens || 12000,
  });
}

export async function getArchitecture(projectId, options = {}) {
  const index = await getProjectIndex(projectId, options.provider);
  return buildArchitectureFacts({
    project: index.project,
    files: index.files,
    relations: index.relations,
  });
}
