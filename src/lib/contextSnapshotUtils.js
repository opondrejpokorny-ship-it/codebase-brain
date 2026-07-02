// @ts-nocheck
import { safeCreateEntity } from '@/lib/optionalEntityRuntime';

export function buildContextSnapshotRecord(projectId, data = {}, metadata = {}) {
  return {
    project_id: projectId,
    type: 'context_pack_snapshot',
    metadata,
    selected_files: (data.selectedFiles || []).map((file) => file.path || file).filter(Boolean),
    selected_relations: data.selectedRelations || [],
    warnings: data.warnings || [],
    estimated_tokens: data.estimatedTokens || 0,
    depth: data.depth || metadata.depth || 'balanced',
    created_date: new Date().toISOString(),
  };
}

export async function saveContextSnapshot(projectId, data = {}, metadata = {}) {
  const record = buildContextSnapshotRecord(projectId, data, metadata);
  const result = await safeCreateEntity('ContextPack', record);
  return {
    saved: result.saved || record,
    source: result.source,
    error: result.error,
    persisted: result.source === 'persisted_storage' && Boolean(result.saved),
  };
}
