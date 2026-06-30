import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import EmptyImportQueue from "@/components/projects/import-queue/EmptyImportQueue";
import ImportQueueActions from "@/components/projects/import-queue/ImportQueueActions";
import ImportQueueHeader from "@/components/projects/import-queue/ImportQueueHeader";
import ImportQueueSidePanel from "@/components/projects/import-queue/ImportQueueSidePanel";
import QueuedTargetList from "@/components/projects/import-queue/QueuedTargetList";
import { useMissingContextImportQueue } from "@/hooks/useMissingContextImportQueue";
import { formatMissingContextImportPrompt } from "@/lib/missingContextQueueUtils";

export default function MissingContextImportQueue() {
  const { id } = useParams();
  const queueState = useMissingContextImportQueue(id);

  if (queueState.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  const importPrompt = formatMissingContextImportPrompt({
    projectName: queueState.project?.name || "this project",
    repositoryUrl: queueState.project?.repository_url || "",
    queue: queueState.queue,
  });

  return (
    <div className="space-y-6">
      <Link to={`/project/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors duration-150 cursor-pointer">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Project
      </Link>

      <ImportQueueHeader
        queueLength={queueState.queue.length}
        indexedCount={queueState.indexedCount}
        missingCount={queueState.missingCount}
      />

      {!queueState.queue.length ? (
        <EmptyImportQueue />
      ) : (
        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="font-heading font-semibold text-sm text-slate-900">Queued targets</h2>
                <p className="text-xs text-slate-400 mt-1">Saved to project metadata when possible.</p>
              </div>
              <ImportQueueActions
                projectId={id}
                project={queueState.project}
                queue={queueState.queue}
                resolving={queueState.resolving}
                canResolve={queueState.canResolve}
                hasResolvedTargets={queueState.hasResolvedTargets}
                onResolve={queueState.resolveFromGitHub}
                onClearResolved={queueState.clearResolved}
                onClearQueue={queueState.clearQueue}
              />
            </div>

            {queueState.message && <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2 mb-3">{queueState.message}</p>}
            {queueState.error && <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 mb-3">{queueState.error}</p>}

            <QueuedTargetList resolvedQueue={queueState.resolvedQueue} />
          </div>

          <ImportQueueSidePanel importPrompt={importPrompt} />
        </div>
      )}
    </div>
  );
}
