import { base44 } from "@/api/base44Client";
import { buildCodeRelations } from "@/lib/codeGraphUtils";

function relationKey(relation) {
  return `${relation.project_id || ""}|${relation.from_file}|${relation.relation_type}|${relation.to_file || relation.import_path}`;
}

export async function loadPersistedCodeRelations(projectId) {
  try {
    if (!base44.entities.CodeRelation?.filter) return [];
    return await base44.entities.CodeRelation.filter({ project_id: projectId }, "created_date", 1000);
  } catch {
    return [];
  }
}

export async function persistCodeRelationsIfAvailable({ projectId, files = [] }) {
  const relations = buildCodeRelations(files).map((relation) => ({
    ...relation,
    project_id: projectId || relation.project_id || null,
  }));

  try {
    const entity = base44.entities.CodeRelation;
    if (!entity?.filter || !entity?.create || !entity?.update) {
      return { persisted: false, relations, reason: "CodeRelation entity is not available" };
    }

    const existing = await entity.filter({ project_id: projectId }, "created_date", 1000);
    const existingByKey = new Map((existing || []).map((relation) => [relationKey(relation), relation]));
    let created = 0;
    let updated = 0;

    for (const relation of relations) {
      const key = relationKey(relation);
      const current = existingByKey.get(key);
      if (current?.id) {
        await entity.update(current.id, relation);
        updated += 1;
      } else {
        await entity.create(relation);
        created += 1;
      }
    }

    return { persisted: true, relations, created, updated };
  } catch (error) {
    return {
      persisted: false,
      relations,
      reason: error?.message || "CodeRelation persistence failed",
    };
  }
}

export async function getCodeRelationsWithFallback({ projectId, files = [] }) {
  const persisted = await loadPersistedCodeRelations(projectId);
  if (persisted.length > 0) {
    return { relations: persisted, source: "persisted" };
  }

  const result = await persistCodeRelationsIfAvailable({ projectId, files });
  return {
    relations: result.relations || buildCodeRelations(files),
    source: result.persisted ? "persisted_after_build" : "in_memory_fallback",
    persistence: result,
  };
}
