import { useEffect, useState } from "react";
import { Check, ClipboardCopy, PackageSearch, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CoverageCard from "@/components/projects/context-pack-inspector/CoverageCard";
import MissingContextList from "@/components/projects/context-pack-inspector/MissingContextList";
import RelationList from "@/components/projects/context-pack-inspector/RelationList";
import SelectedFilesList from "@/components/projects/context-pack-inspector/SelectedFilesList";
import {
  buildContextPackCopyText,
  buildCoverageSummary,
  isChangedFileRelation,
  isMissingContextRelation,
  isSelectedFileRelation,
  queueItemFromRelation,
  uniqueMissingPathGuesses,
  uniqueRelations,
} from "@/lib/contextPackInspectorUtils";
import { formatMissingContextImportPrompt, formatMissingContextQueue, readMissingContextQueueForProject } from "@/lib/missingContextQueueUtils";
import {
  addPersistentMissingContextQueueItems,
  clearPersistentMissingContextQueue,
} from "@/lib/persistentMissingContextQueue";
import { formatEstimatedTokens } from "@/lib/tokenBudgetUtils";

export default function ContextPackInspector({ contextPack, changedFiles = [], projectId = null, project = null }) {
  const [copied, setCopied] = useState(false);
  const [copiedPaths, setCopiedPaths] = useState(false);
  const [copiedImportInstructions, setCopiedImportInstructions] = useState(false);
  const [copiedQueue, setCopiedQueue] = useState(false);
  const [queued, setQueued] = useState(false);
  const [queuedTargets, setQueuedTargets] = useState(() => readMissingContextQueueForProject(projectId, project));

  useEffect(() => {
    setQueuedTargets(readMissingContextQueueForProject(projectId, project));
    setQueued(false);
    setCopiedQueue(false);
    setCopiedImportInstructions(false);
  }, [projectId, project]);

  if (!contextPack) return null;

  const selectedFiles = contextPack.selectedFiles || [];
  const selectedRelations = contextPack.selectedRelations || [];
  const warnings = contextPack.warnings || [];
  const efficiency = contextPack.efficiency || {};
  const selectedFileTokens = efficiency.selectedFileTokens || efficiency.selectedTokens || contextPack.estimatedTokens || 0;
  const extraContextTokens = efficiency.extraContextTokens || 0;
  const fullRepoTokens = efficiency.fullRepoTokens || 0;
  const depthLabel = contextPack.depthPreset || contextPack.depth || "Balanced";
  const changedSet = new Set(changedFiles || []);
  const selectedPathSet = new Set(selectedFiles.map((file) => file.path).filter(Boolean));

  const changedConnectedRelations = selectedRelations.filter((relation) => isChangedFileRelation(relation, changedSet));
  const missingContextRelations = uniqueRelations(changedConnectedRelations.filter(isMissingContextRelation));
  const directChangedRelations = changedConnectedRelations.filter((relation) => !isMissingContextRelation(relation));
  const selectedContextRelations = selectedRelations.filter((relation) =>
    !isChangedFileRelation(relation, changedSet) &&
    !isMissingContextRelation(relation) &&
    isSelectedFileRelation(relation, selectedPathSet)
  );

  const currentMissingTargets = uniqueMissingPathGuesses(missingContextRelations);
  const currentMissingTargetSet = new Set(currentMissingTargets);
  const coverage = buildCoverageSummary(directChangedRelations, missingContextRelations);
  const queuedCurrentTargets = queuedTargets.filter((item) => currentMissingTargetSet.has(item.target));
  const queuedOtherTargets = queuedTargets.filter((item) => !currentMissingTargetSet.has(item.target));
  const queuedCurrentSet = new Set(queuedCurrentTargets.map((item) => item.target));
  const allCurrentMissingTargetsQueued = currentMissingTargets.length > 0 && currentMissingTargets.every((path) => queuedCurrentSet.has(path));
  const queueButtonActive = queued || allCurrentMissingTargetsQueued;

  const handleCopy = async () => {
    const text = buildContextPackCopyText({ contextPack, selectedFiles, directChangedRelations, selectedContextRelations, missingContextRelations, coverage, efficiency });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const handleCopyMissingPaths = async () => {
    try {
      await navigator.clipboard.writeText(currentMissingTargets.join("\n"));
      setCopiedPaths(true);
      window.setTimeout(() => setCopiedPaths(false), 1600);
    } catch {
      setCopiedPaths(false);
    }
  };

  const handleCopyImportInstructions = async () => {
    const queue = currentMissingTargets.map((target) => ({ target }));
    const text = formatMissingContextImportPrompt({ projectName: project?.name || "this project", repositoryUrl: project?.repository_url || "", queue });
    try {
      await navigator.clipboard.writeText(text);
      setCopiedImportInstructions(true);
      window.setTimeout(() => setCopiedImportInstructions(false), 1600);
    } catch {
      setCopiedImportInstructions(false);
    }
  };

  const handleAddToQueue = async () => {
    const items = missingContextRelations.map(queueItemFromRelation).filter(Boolean);
    const next = await addPersistentMissingContextQueueItems(projectId, items, project);
    setQueuedTargets(next);
    setQueued(true);
  };

  const handleCopyQueue = async () => {
    try {
      await navigator.clipboard.writeText(formatMissingContextQueue(queuedTargets));
      setCopiedQueue(true);
      window.setTimeout(() => setCopiedQueue(false), 1600);
    } catch {
      setCopiedQueue(false);
    }
  };

  const handleClearQueue = async () => {
    const next = await clearPersistentMissingContextQueue(projectId, project);
    setQueuedTargets(next);
    setQueued(false);
    setCopiedQueue(false);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-heading font-semibold text-sm text-slate-900 flex items-center gap-2"><PackageSearch className="w-4 h-4 text-slate-500" />Context Pack Inspector</h3>
          <p className="text-xs text-slate-400 mt-1">Shows the selected files and why they were included.</p>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="flex flex-wrap justify-end gap-1.5">
            <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">{selectedFiles.length} files</Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{depthLabel} context</Badge>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="h-8 gap-1.5 cursor-pointer text-xs">
            {copied ? <Check className="w-3.5 h-3.5" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy summary"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-xs">
        <div className="rounded-md bg-slate-50 px-2 py-2"><p className="text-slate-400">Selected files</p><p className="font-semibold text-slate-700">{formatEstimatedTokens(selectedFileTokens)}</p></div>
        <div className="rounded-md bg-slate-50 px-2 py-2"><p className="text-slate-400">Extra context</p><p className="font-semibold text-slate-700">{formatEstimatedTokens(extraContextTokens)}</p></div>
        <div className="rounded-md bg-slate-50 px-2 py-2"><p className="text-slate-400">Full repo files</p><p className="font-semibold text-slate-700">{formatEstimatedTokens(fullRepoTokens)}</p></div>
        <div className="rounded-md bg-emerald-50 px-2 py-2"><p className="text-emerald-500">Files saved</p><p className="font-semibold text-emerald-700">{efficiency.savingsPercent || 0}%</p></div>
      </div>

      <CoverageCard coverage={coverage} />

      {warnings.length > 0 && <div className="mb-4 rounded-lg bg-amber-50 border border-amber-100 p-3"><p className="text-xs font-medium text-amber-800 flex items-center gap-1.5 mb-2"><TriangleAlert className="w-3.5 h-3.5" />Context warnings</p><div className="space-y-1">{warnings.map((warning) => <p key={warning} className="text-xs text-amber-700">• {warning}</p>)}</div></div>}

      <SelectedFilesList files={selectedFiles} reasonsByPath={contextPack.reasons || {}} relevanceScores={contextPack.relevanceScores || {}} />

      <MissingContextList
        relations={missingContextRelations}
        currentMissingTargets={currentMissingTargets}
        queuedCurrentTargets={queuedCurrentTargets}
        queuedOtherTargets={queuedOtherTargets}
        onCopyPaths={handleCopyMissingPaths}
        copiedPaths={copiedPaths}
        onCopyImportInstructions={handleCopyImportInstructions}
        copiedImportInstructions={copiedImportInstructions}
        onAddToQueue={handleAddToQueue}
        queued={queueButtonActive}
        queuedTargets={queuedTargets}
        onCopyQueue={handleCopyQueue}
        copiedQueue={copiedQueue}
        onClearQueue={handleClearQueue}
        canQueue={Boolean(projectId)}
      />
      <RelationList title="Graph relations connected to changed files" relations={directChangedRelations} />
      <RelationList title="Relations among selected context files" relations={selectedContextRelations} limit={8} />
    </div>
  );
}
