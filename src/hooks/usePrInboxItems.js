// @ts-nocheck
import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { mergePrInboxItems, readLocalPrInbox } from '@/lib/prInboxStorage';
import { filterPrAnalysisItems, normalizePrAnalysisItem } from '@/lib/prAnalysisOverlayUtils';
import { safeFilterEntity } from '@/lib/optionalEntityRuntime';

export function usePrInboxItems(projectId) {
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState('loading');
  const [error, setError] = useState(null);

  const loadInbox = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [projects, storedFiles, remoteResult] = await Promise.all([
        base44.entities.CodebaseProject.filter({ id: projectId }).catch(() => []),
        base44.entities.CodeFile.filter({ project_id: projectId }, 'path', 1000).catch(() => []),
        safeFilterEntity('CodebaseAnalysis', { project_id: projectId }, 'created_date', 80),
      ]);

      const remoteItems = filterPrAnalysisItems(remoteResult.records || []);
      const localItems = readLocalPrInbox(projectId).map(normalizePrAnalysisItem);
      const merged = mergePrInboxItems(remoteItems, localItems).map(normalizePrAnalysisItem);

      setProject(projects?.[0] || null);
      setFiles(storedFiles || []);
      setItems(merged);
      setSource(remoteResult.source || 'unknown');
      setError(remoteResult.error || null);
      return { project: projects?.[0] || null, files: storedFiles || [], items: merged };
    } catch (loadError) {
      setError(loadError?.message || String(loadError));
      return { project: null, files: [], items: [] };
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  return { project, files, items, setItems, loading, source, error, loadInbox };
}
