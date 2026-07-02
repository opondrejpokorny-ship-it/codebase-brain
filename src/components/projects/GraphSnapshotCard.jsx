// @ts-nocheck
import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Database, Download, Loader2, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import GraphPersistenceStatusBadges from '@/components/projects/GraphPersistenceStatusBadges';
import GraphSnapshotSaveWarning from '@/components/projects/GraphSnapshotSaveWarning';
import { buildGraphSnapshot, graphSnapshotToMarkdown, persistGraphSnapshot } from '@/lib/graphPersistenceUtils';
import { canWriteEntity, optionalEntity } from '@/lib/optionalEntityRuntime';
import { downloadJsonReport, downloadMarkdownReport } from '@/lib/reportDownloadUtils';

function GraphPersistResultSummary({ result }) {
  if (!result) return null;
  const errors = result.errors || [];
  const persisted = Boolean(result.persisted);
  const Icon = persisted && errors.length === 0 ? CheckCircle2 : AlertCircle;

  return (
    <div className={`mt-3 rounded-lg border px-3 py-2 text-xs ${persisted ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
      <div className="flex items-center gap-1.5 font-medium">
        <Icon className="w-3.5 h-3.5" />
        {persisted ? 'Snapshot persisted' : `Snapshot not persisted: ${result.reason || 'unknown reason'}`}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
        <span>Relations: {result.relation_records_saved || 0}/{result.relation_records_attempted || result.snapshot?.relations?.length || 0}</span>
        <span>Symbols: {result.symbol_records_saved || 0}/{result.symbol_records_attempted || result.snapshot?.symbols?.length || 0}</span>
        {errors.length > 0 && <span>Errors: {errors.length}</span>}
      </div>
      {errors.length > 0 && (
        <p className="mt-1 text-[11px] opacity-80">First error: {errors[0]?.message || 'Unknown persistence error'}</p>
      )}
    </div>
  );
}

export default function GraphSnapshotCard({ project, files = [] }) {
  const snapshot = useMemo(() => buildGraphSnapshot({ project, files }), [project, files]);
  const unresolved = snapshot.coverage?.unresolved_imports || 0;
  const topFiles = snapshot.coverage?.top_connected_files || [];
  const canPersistGraph = canWriteEntity('CodeRelation') || canWriteEntity('CodeSymbol');
  const [persisting, setPersisting] = useState(false);
  const [persistResult, setPersistResult] = useState(null);

  const persistSnapshot = async () => {
    if (!canPersistGraph || persisting) return;
    setPersisting(true);
    const result = await persistGraphSnapshot({
      project,
      files,
      entities: {
        CodeRelation: optionalEntity('CodeRelation'),
        CodeSymbol: optionalEntity('CodeSymbol'),
      },
    });
    setPersistResult(result);
    setPersisting(false);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h2 className="font-heading font-semibold text-sm text-slate-900 flex items-center gap-2">
            <Network className="w-4 h-4 text-slate-500" />
            Graph Snapshot
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Dry-run snapshot for future persisted CodeRelation / CodeSymbol entities.
          </p>
          <GraphPersistenceStatusBadges className="mt-2" />
        </div>
        <div className="flex flex-wrap gap-2">
          {canPersistGraph && (
            <Button variant="outline" size="sm" className="gap-1.5 cursor-pointer" onClick={persistSnapshot} disabled={persisting}>
              {persisting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
              {persisting ? 'Saving' : 'Save snapshot'}
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5 cursor-pointer" onClick={() => downloadJsonReport(project?.name || 'project', 'graph-snapshot', snapshot)}>
            <Download className="w-3.5 h-3.5" /> Export JSON
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 cursor-pointer" onClick={() => downloadMarkdownReport(project?.name || 'project', 'graph-snapshot', graphSnapshotToMarkdown(snapshot))}>
            <Download className="w-3.5 h-3.5" /> Export MD
          </Button>
        </div>
      </div>

      {canPersistGraph && <GraphSnapshotSaveWarning className="mt-3" />}
      <GraphPersistResultSummary result={persistResult} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
        <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
          <p className="text-xs text-slate-400">Files</p>
          <p className="text-lg font-semibold text-slate-900">{snapshot.file_count}</p>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
          <p className="text-xs text-slate-400">Relations</p>
          <p className="text-lg font-semibold text-slate-900">{snapshot.relation_count}</p>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
          <p className="text-xs text-slate-400">Symbols</p>
          <p className="text-lg font-semibold text-slate-900">{snapshot.symbol_count}</p>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
          <p className="text-xs text-slate-400">Unresolved</p>
          <p className="text-lg font-semibold text-slate-900">{unresolved}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">{snapshot.schema_version}</Badge>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">dry run</Badge>
        {unresolved > 0 && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">missing context likely</Badge>}
      </div>

      {topFiles.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-slate-500 mb-2">Top connected files</p>
          <div className="flex flex-wrap gap-1.5">
            {topFiles.slice(0, 6).map((file) => (
              <span key={file.path} className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                {file.path} · {file.score}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
