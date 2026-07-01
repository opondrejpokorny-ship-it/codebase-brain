// @ts-nocheck
import { base44 } from '@/api/base44Client';
import { buildRecordSourceSummary } from '@/lib/recordSourceUtils';

export const DEFAULT_OPTIONAL_ENTITY_NAMES = [
  'CodeRelation',
  'CodeSymbol',
  'DecisionMemory',
  'ContextPack',
  'CodebaseAnalysis',
];

export function optionalEntityNames() {
  return [...DEFAULT_OPTIONAL_ENTITY_NAMES];
}

export function optionalEntity(entityName) {
  try {
    return base44?.entities?.[entityName] || null;
  } catch {
    return null;
  }
}

export function canReadEntity(entityName) {
  const entity = optionalEntity(entityName);
  return Boolean(entity?.filter || entity?.list || entity?.get);
}

export function canWriteEntity(entityName) {
  const entity = optionalEntity(entityName);
  return Boolean(entity?.create || entity?.update);
}

export function entitySourceLabel({ remoteCount = 0, localCount = 0 } = {}) {
  return buildRecordSourceSummary({
    remoteRecords: new Array(Math.max(0, remoteCount)),
    localRecords: new Array(Math.max(0, localCount)),
  }).label;
}

export async function safeFilterEntity(entityName, filters = {}, sort = null, limit = null) {
  const entity = optionalEntity(entityName);
  if (!entity?.filter) return { records: [], source: 'missing_entity', error: null };
  try {
    const args = [filters];
    if (sort !== null) args.push(sort);
    if (limit !== null) args.push(limit);
    const records = await entity.filter(...args);
    return { records: Array.isArray(records) ? records : [], source: 'persisted_storage', error: null };
  } catch (error) {
    return { records: [], source: 'persisted_storage_error', error: error?.message || String(error) };
  }
}

export async function safeCreateEntity(entityName, record = {}) {
  const entity = optionalEntity(entityName);
  if (!entity?.create) return { saved: null, source: 'missing_entity', error: null };
  try {
    const saved = await entity.create(record);
    return { saved, source: 'persisted_storage', error: null };
  } catch (error) {
    return { saved: null, source: 'persisted_storage_error', error: error?.message || String(error) };
  }
}
