import { useState } from "react";
import { Check, ClipboardCopy, FileText, GitBranch, Info, PackageSearch, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatEstimatedTokens } from "@/lib/tokenBudgetUtils";

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

function suggestedMissingPath(importPath = "") {
  const value = String(importPath || "");
  if (value.startsWith("@/") || value.startsWith("~/")) {
    return `src/${value.slice(2)}`;
  }
  if (value.startsWith("src/")) return value;
  return value;
}

function missingContextLabel(relation) {
  const target = suggestedMissingPath(relation?.import_path || "");
  const suffix = target
    ? `try ${target}.{js,jsx,ts,tsx} or ${target}/index.{js,jsx,ts,tsx}`
    : "target path could not be inferred";
  return `${relation.from_file} imports ${relation.import_path} → missing from stored context; ${suffix}`;
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

function formatReasons(reasons = []) {
  if (!reasons.length) return "  - No explicit selection reason captured.";
  return reasons.map((reason) => `  - ${reason}`).join("\n");
}

function buildCopyText({ contextPack, selectedFiles, directChangedRelations, otherContextRelations, missingContextRelations, efficiency }) {
  return `# Codebase Brain Context Pack Summary

Selected files: ${selectedFiles.length}
Selected tokens: ${formatEstimatedTokens(efficiency.selectedTokens || contextPack.estimatedTokens || 0)}
Full repo estimate: ${formatEstimatedTokens(efficiency.fullRepoTokens || 0)}
Estimated savings: ${efficiency.savingsPercent || 0}%

## Context warnings
${(contextPack.warnings || []).length ? (contextPack.warnings || []).map((warning) => `- ${warning}`).join("\n") : "- None"}

## Selected files and reasons
${selectedFiles.map((file) => `### ${file.path}\n${formatReasons(contextPack.reasons?.[file.path] || [])}`).join("\n\n")}

## Missing context candidates
${missingContextRelations.length ? missingContextRelations.map((relation) => `- ${missingContextLabel(relation)}`).join("\n") : "- None"}

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

function MissingContextList({ relations = [] }) {
  if (!relations.length) return null;

  return (
    <div className="mt-4 rounded-lg bg-amber-50 border border-amber-100 p-3">
      <p className="text-xs font-medium text-amber-800 flex items-center gap-1.5 mb-2">
        <TriangleAlert className="w-3.5 h-3.5" />
        Missing context candidates
      </p>
      <div className="space-y-1 max-h-36 overflow-y-auto">
        {relations.map((relation, index) => (
          <p key={`${relation.from_file}-${relation.import_path}-${index}`} className="text-xs text-amber-700 break-all">
            • {missingContextLabel(relation)}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function ContextPackInspector({ contextPack, changedFiles = [] }) {
  const [copied, setCopied] = useState(false);
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

  const handleCopy = async () => {
    const text = buildCopyText({ contextPack, selectedFiles, directChangedRelations, otherContextRelations, missingContextRelations, efficiency });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
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

      <MissingContextList relations={missingContextRelations} />
      <RelationList title="Graph relations connected to changed files" relations={directChangedRelations} />
      <RelationList title="Other selected context relations" relations={otherContextRelations} limit={8} />
    </div>
  );
}
