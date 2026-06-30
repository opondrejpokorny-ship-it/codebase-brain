import { useEffect, useState } from "react";
import { Check, ClipboardCopy, FileText, GitBranch, Info, PackageSearch, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatEstimatedTokens } from "@/lib/tokenBudgetUtils";

const MISSING_CONTEXT_QUEUE_KEY = "codebase_brain_missing_context_queue_v1";

function storageAvailable() {
  try {
    return typeof window !== "undefined" && Boolean(window.localStorage);
  } catch {
    return false;
  }
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function readMissingContextQueue(projectId) {
  if (!projectId || !storageAvailable()) return [];
  const all = safeJsonParse(window.localStorage.getItem(MISSING_CONTEXT_QUEUE_KEY) || "{}", {});
  return Array.isArray(all[projectId]) ? all[projectId] : [];
}

function writeMissingContextQueue(projectId, queue = []) {
  if (!projectId || !storageAvailable()) return [];
  const all = safeJsonParse(window.localStorage.getItem(MISSING_CONTEXT_QUEUE_KEY) || "{}", {});
  all[projectId] = queue;
  window.localStorage.setItem(MISSING_CONTEXT_QUEUE_KEY, JSON.stringify(all));
  return queue;
}

function clearMissingContextQueue(projectId) {
  return writeMissingContextQueue(projectId, []);
}

function relationLabel(relation) {
  if (!relation) return "";
  return `${relation.from_file} ${relation.relation_type} ${relation.import_path}${relation.to_file ? ` → ${relation.to_file}` : ""}`;
}

function isChangedFileRelation(relation, changedSet) {
  if (!relation || changedSet.size === 0) return false;
  return changedSet.has(relation.from_file) || (relation.to_file && changedSet.has(relation.to_file));
}

function isMissingContextRelation(relation) {
  return relation?.relation_type === "alias_unresolved" || relation?.relation_type === "unresolved_relative";
}

function isInternalContextRelation(relation) {
  return relation?.target_kind === "internal_file" || Boolean(relation?.to_file);
}

function suggestedMissingPath(importPath = "") {
  const value = String(importPath || "");
  if (value.startsWith("@/") || value.startsWith("~/")) {
    return `src/${value.slice(2)}`;
  }
  if (value.startsWith("src/")) return value;
  return value;
}

function bestMissingPathGuess(relation) {
  return suggestedMissingPath(relation?.import_path || "");
}

function missingContextLabel(relation) {
  const target = suggestedMissingPath(relation?.import_path || "");
  const suffix = target
    ? `try ${target}.{js,jsx,ts,tsx} or ${target}/index.{js,jsx,ts,tsx}`
    : "target path could not be inferred";
  return `${relation.from_file} imports ${relation.import_path} → missing from stored context; ${suffix}`;
}

function queueItemFromRelation(relation) {
  const target = bestMissingPathGuess(relation);
  if (!target) return null;
  return {
    target,
    source_file: relation?.from_file || "",
    import_path: relation?.import_path || "",
    relation_type: relation?.relation_type || "missing_context",
    added_at: new Date().toISOString(),
  };
}

function addMissingTargetsToQueue(projectId, relations = []) {
  if (!projectId) return [];
  const current = readMissingContextQueue(projectId);
  const byTarget = new Map(current.map((item) => [item.target, item]));

  for (const relation of relations) {
    const item = queueItemFromRelation(relation);
    if (!item) continue;
    byTarget.set(item.target, {
      ...(byTarget.get(item.target) || {}),
      ...item,
    });
  }

  const next = [...byTarget.values()].sort((a, b) => String(a.target).localeCompare(String(b.target)));
  return writeMissingContextQueue(projectId, next);
}

function queueText(queue = []) {
  return queue.map((item) => item.target).filter(Boolean).join("\n");
}

function uniqueRelations(relations = []) {
  const seen = new Set();
  return relations.filter((relation) => {
    const key = `${relation.from_file}|${relation.relation_type}|${relation.import_path}|${relation.to_file || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueMissingPathGuesses(relations = []) {
  return [...new Set(relations.map(bestMissingPathGuess).filter(Boolean))];
}

function formatReasons(reasons = []) {
  if (!reasons.length) return "  - No explicit selection reason captured.";
  return reasons.map((reason) => `  - ${reason}`).join("\n");
}

function buildCoverageSummary(directChangedRelations = [], missingContextRelations = []) {
  const resolvedInternal = directChangedRelations.filter(isInternalContextRelation).length;
  const missing = missingContextRelations.length;
  const total = resolvedInternal + missing;
  const score = total ? Math.round((resolvedInternal / total) * 100) : 100;

  let status = "complete";
  if (score < 50) status = "low";
  else if (score < 80) status = "partial";
  else if (score < 100) status = "good";

  return {
    status,
    score,
    resolvedInternal,
    missing,
    total,
  };
}

function coverageBadgeClass(status) {
  if (status === "complete" || status === "good") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "partial") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

function buildCopyText({ contextPack, selectedFiles, directChangedRelations, otherContextRelations, missingContextRelations, coverage, efficiency }) {
  return `# Codebase Brain Context Pack Summary

Selected files: ${selectedFiles.length}
Selected tokens: ${formatEstimatedTokens(efficiency.selectedTokens || contextPack.estimatedTokens || 0)}
Full repo estimate: ${formatEstimatedTokens(efficiency.fullRepoTokens || 0)}
Estimated savings: ${efficiency.savingsPercent || 0}%
Context coverage: ${coverage.status} · ${coverage.score}%
Resolved internal imports: ${coverage.resolvedInternal}/${coverage.total}
Missing context candidates: ${missingContextRelations.length}

## Context warnings
${(contextPack.warnings || []).length ? (contextPack.warnings || []).map((warning) => `- ${warning}`).join("\n") : "- None"}

## Selected files and reasons
${selectedFiles.map((file) => `### ${file.path}\n${formatReasons(contextPack.reasons?.[file.path] || [])}`).join("\n\n")}

## Missing context candidates
${missingContextRelations.length ? missingContextRelations.map((relation) => `- ${missingContextLabel(relation)}`).join("\n") : "- None"}

## Suggested missing import targets
${uniqueMissingPathGuesses(missingContextRelations).length ? uniqueMissingPathGuesses(missingContextRelations).map((path) => `- ${path}`).join("\n") : "- None"}

## Graph relations connected to changed files
${directChangedRelations.length ? directChangedRelations.map((relation) => `- ${relationLabel(relation)}`).join("\n") : "- None"}

## Other selected context relations
${otherContextRelations.length ? otherContextRelations.slice(0, 20).map((relation) => `- ${relationLabel(relation)}`).join("\n") : "- None"}`;
}

function RelationList({ title, relations = [], limit = 12 }) {
  if (!relations.length) return null;

  return (
    <div className="mt-4 pt-4 border-t border-slate-100">
      <p className="text-xs font-medium text-slate-700 flex items-center gap-1.5 mb-2">
        <GitBranch className="w-3.5 h-3.5 text-slate-400" />
        {title}
      </p>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {relations.slice(0, limit).map((relation, index) => (
          <p key={`${relation.from_file}-${relation.import_path}-${index}`} className="text-xs font-mono text-slate-500 break-all">
            {relationLabel(relation)}
          </p>
        ))}
        {relations.length > limit && (
          <p className="text-xs text-slate-400">+{relations.length - limit} more relations</p>
        )}
      </div>
    </div>
  );
}

function CoverageCard({ coverage }) {
  return (
    <div className="mb-4 rounded-lg bg-slate-50 border border-slate-100 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-700">Context coverage</p>
          <p className="text-xs text-slate-500 mt-1">
            Resolved internal imports from changed files: {coverage.resolvedInternal}/{coverage.total}
          </p>
        </div>
        <Badge variant="outline" className={coverageBadgeClass(coverage.status)}>
          {coverage.status} · {coverage.score}%
        </Badge>
      </div>
      {coverage.missing > 0 && (
        <p className="text-xs text-amber-700 mt-2">
          {coverage.missing} direct import target{coverage.missing === 1 ? "" : "s"} missing from the stored sample.
        </p>
      )}
    </div>
  );
}

function QueuedTargetsPanel({ queue = [], onCopyQueue, copiedQueue, onClearQueue }) {
  if (!queue.length) return null;

  return (
    <div className="mt-3 rounded-lg bg-white/70 border border-amber-100 p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-xs font-medium text-amber-900">Queued import targets</p>
          <p className="text-xs text-amber-700 mt-0.5">Ready for the next import or re-index step.</p>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <Button type="button" variant="outline" size="sm" onClick={onCopyQueue} className="h-7 gap-1.5 cursor-pointer text-xs bg-white/80">
            {copiedQueue ? <Check className="w-3 h-3" /> : <ClipboardCopy className="w-3 h-3" />}
            {copiedQueue ? "Copied" : "Copy queue"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onClearQueue} className="h-7 cursor-pointer text-xs bg-white/80">
            Clear queue
          </Button>
        </div>
      </div>
      <div className="space-y-1 max-h-28 overflow-y-auto">
        {queue.map((item) => (
          <p key={item.target} className="text-xs font-mono text-amber-800 break-all">
            {item.target}
          </p>
        ))}
      </div>
    </div>
  );
}

function MissingContextList({ relations = [], onCopyPaths, copiedPaths, onAddToQueue, queued, queuedTargets, onCopyQueue, copiedQueue, onClearQueue, canQueue }) {
  if (!relations.length) return null;

  return (
    <div className="mt-4 rounded-lg bg-amber-50 border border-amber-100 p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs font-medium text-amber-800 flex items-center gap-1.5">
          <TriangleAlert className="w-3.5 h-3.5" />
          Missing context candidates
        </p>
        <div className="flex flex-wrap justify-end gap-1.5">
          <Button type="button" variant="outline" size="sm" onClick={onCopyPaths} className="h-7 gap-1.5 cursor-pointer text-xs bg-white/70">
            {copiedPaths ? <Check className="w-3 h-3" /> : <ClipboardCopy className="w-3 h-3" />}
            {copiedPaths ? "Copied" : "Copy targets"}
          </Button>
          {canQueue && (
            <Button type="button" variant="outline" size="sm" onClick={onAddToQueue} className="h-7 gap-1.5 cursor-pointer text-xs bg-white/70">
              {queued ? <Check className="w-3 h-3" /> : <PackageSearch className="w-3 h-3" />}
              {queued ? "Queued" : "Add to queue"}
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-amber-700 mb-2">
        {relations.length} import target{relations.length === 1 ? "" : "s"} from changed files are missing from the stored sample. Add these files to improve graph coverage.
      </p>
      {queuedTargets.length > 0 && (
        <p className="text-xs text-amber-800 mb-2">
          {queuedTargets.length} target{queuedTargets.length === 1 ? "" : "s"} currently queued for the next import.
        </p>
      )}
      <div className="space-y-1 max-h-36 overflow-y-auto">
        {relations.map((relation, index) => (
          <p key={`${relation.from_file}-${relation.import_path}-${index}`} className="text-xs text-amber-700 break-all">
            • {missingContextLabel(relation)}
          </p>
        ))}
      </div>
      <QueuedTargetsPanel queue={queuedTargets} onCopyQueue={onCopyQueue} copiedQueue={copiedQueue} onClearQueue={onClearQueue} />
    </div>
  );
}

export default function ContextPackInspector({ contextPack, changedFiles = [], projectId = null }) {
  const [copied, setCopied] = useState(false);
  const [copiedPaths, setCopiedPaths] = useState(false);
  const [copiedQueue, setCopiedQueue] = useState(false);
  const [queued, setQueued] = useState(false);
  const [queuedTargets, setQueuedTargets] = useState(() => readMissingContextQueue(projectId));

  useEffect(() => {
    setQueuedTargets(readMissingContextQueue(projectId));
    setQueued(false);
    setCopiedQueue(false);
  }, [projectId]);

  if (!contextPack) return null;

  const selectedFiles = contextPack.selectedFiles || [];
  const selectedRelations = contextPack.selectedRelations || [];
  const warnings = contextPack.warnings || [];
  const efficiency = contextPack.efficiency || {};
  const changedSet = new Set(changedFiles || []);
  const changedConnectedRelations = selectedRelations.filter((relation) => isChangedFileRelation(relation, changedSet));
  const missingContextRelations = uniqueRelations(changedConnectedRelations.filter(isMissingContextRelation));
  const directChangedRelations = changedConnectedRelations.filter((relation) => !isMissingContextRelation(relation));
  const otherContextRelations = selectedRelations.filter((relation) => !isChangedFileRelation(relation, changedSet) && !isMissingContextRelation(relation));
  const missingPathGuesses = uniqueMissingPathGuesses(missingContextRelations);
  const coverage = buildCoverageSummary(directChangedRelations, missingContextRelations);
  const queuedTargetSet = new Set(queuedTargets.map((item) => item.target).filter(Boolean));
  const allCurrentMissingTargetsQueued = missingPathGuesses.length > 0 && missingPathGuesses.every((path) => queuedTargetSet.has(path));
  const queueButtonActive = queued || allCurrentMissingTargetsQueued;

  const handleCopy = async () => {
    const text = buildCopyText({ contextPack, selectedFiles, directChangedRelations, otherContextRelations, missingContextRelations, coverage, efficiency });
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
      await navigator.clipboard.writeText(missingPathGuesses.join("\n"));
      setCopiedPaths(true);
      window.setTimeout(() => setCopiedPaths(false), 1600);
    } catch {
      setCopiedPaths(false);
    }
  };

  const handleAddToQueue = () => {
    const next = addMissingTargetsToQueue(projectId, missingContextRelations);
    setQueuedTargets(next);
    setQueued(true);
  };

  const handleCopyQueue = async () => {
    try {
      await navigator.clipboard.writeText(queueText(queuedTargets));
      setCopiedQueue(true);
      window.setTimeout(() => setCopiedQueue(false), 1600);
    } catch {
      setCopiedQueue(false);
    }
  };

  const handleClearQueue = () => {
    const next = clearMissingContextQueue(projectId);
    setQueuedTargets(next);
    setQueued(false);
    setCopiedQueue(false);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-heading font-semibold text-sm text-slate-900 flex items-center gap-2">
            <PackageSearch className="w-4 h-4 text-slate-500" />
            Context Pack Inspector
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Shows the actual files selected for this input and why they were included.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
            {selectedFiles.length} files
          </Badge>
          <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="h-8 gap-1.5 cursor-pointer text-xs">
            {copied ? <Check className="w-3.5 h-3.5" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy summary"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
        <div className="rounded-md bg-slate-50 px-2 py-2">
          <p className="text-slate-400">Selected</p>
          <p className="font-semibold text-slate-700">{formatEstimatedTokens(efficiency.selectedTokens || contextPack.estimatedTokens || 0)}</p>
        </div>
        <div className="rounded-md bg-slate-50 px-2 py-2">
          <p className="text-slate-400">Full repo</p>
          <p className="font-semibold text-slate-700">{formatEstimatedTokens(efficiency.fullRepoTokens || 0)}</p>
        </div>
        <div className="rounded-md bg-emerald-50 px-2 py-2">
          <p className="text-emerald-500">Saved</p>
          <p className="font-semibold text-emerald-700">{efficiency.savingsPercent || 0}%</p>
        </div>
      </div>

      <CoverageCard coverage={coverage} />

      {warnings.length > 0 && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-100 p-3">
          <p className="text-xs font-medium text-amber-800 flex items-center gap-1.5 mb-2">
            <TriangleAlert className="w-3.5 h-3.5" />
            Context warnings
          </p>
          <div className="space-y-1">
            {warnings.map((warning) => (
              <p key={warning} className="text-xs text-amber-700">• {warning}</p>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {selectedFiles.map((file) => {
          const reasons = contextPack.reasons?.[file.path] || [];
          return (
            <div key={file.path} className="border border-slate-100 rounded-lg p-3">
              <div className="flex items-start gap-2 mb-2">
                <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs font-mono text-slate-800 break-all">{file.path}</p>
              </div>
              {reasons.length > 0 ? (
                <div className="space-y-1">
                  {reasons.map((reason) => (
                    <p key={reason} className="text-xs text-slate-500 flex gap-1.5">
                      <Info className="w-3 h-3 text-slate-300 mt-0.5 flex-shrink-0" />
                      <span>{reason}</span>
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No explicit selection reason captured.</p>
              )}
            </div>
          );
        })}
      </div>

      <MissingContextList
        relations={missingContextRelations}
        onCopyPaths={handleCopyMissingPaths}
        copiedPaths={copiedPaths}
        onAddToQueue={handleAddToQueue}
        queued={queueButtonActive}
        queuedTargets={queuedTargets}
        onCopyQueue={handleCopyQueue}
        copiedQueue={copiedQueue}
        onClearQueue={handleClearQueue}
        canQueue={Boolean(projectId)}
      />
      <RelationList title="Graph relations connected to changed files" relations={directChangedRelations} />
      <RelationList title="Other selected context relations" relations={otherContextRelations} limit={8} />
    </div>
  );
}
