// @ts-nocheck

export const GRAPH_PERSISTENCE_ENTITIES = ['CodeRelation', 'CodeSymbol'];

export const MEMORY_PERSISTENCE_ENTITIES = ['DecisionMemory', 'ContextPack', 'CodebaseAnalysis'];

export const CORE_OPTIONAL_ENTITIES = [
  ...GRAPH_PERSISTENCE_ENTITIES,
  ...MEMORY_PERSISTENCE_ENTITIES,
];
