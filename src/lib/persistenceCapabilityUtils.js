// @ts-nocheck
import { canReadEntity, canWriteEntity } from '@/lib/optionalEntityRuntime';
import { CORE_OPTIONAL_ENTITIES } from '@/lib/optionalEntityGroups';

export function persistenceCapabilityForEntity(entityName) {
  const canRead = canReadEntity(entityName);
  const canWrite = canWriteEntity(entityName);

  let status = 'local_fallback';
  if (canRead && canWrite) status = 'read_write';
  else if (canRead) status = 'read_only';
  else if (canWrite) status = 'write_only';

  return {
    entityName,
    canRead,
    canWrite,
    status,
    label: `${entityName}: ${status.replace(/_/g, ' ')}`,
  };
}

export function buildPersistenceCapabilityMatrix(entityNames = CORE_OPTIONAL_ENTITIES) {
  const entities = entityNames.map(persistenceCapabilityForEntity);
  return {
    entities,
    total: entities.length,
    readable: entities.filter((entity) => entity.canRead).length,
    writable: entities.filter((entity) => entity.canWrite).length,
    missing: entities.filter((entity) => !entity.canRead && !entity.canWrite).length,
    ready: entities.every((entity) => entity.canRead || entity.canWrite),
  };
}

export function persistenceCapabilitySummary(entityNames = CORE_OPTIONAL_ENTITIES) {
  const matrix = buildPersistenceCapabilityMatrix(entityNames);
  if (!matrix.total) return 'No optional persistence entities configured.';
  if (matrix.ready) return `All ${matrix.total} optional persistence entities are available.`;
  return `${matrix.readable}/${matrix.total} readable, ${matrix.writable}/${matrix.total} writable, ${matrix.missing} using local fallback.`;
}
