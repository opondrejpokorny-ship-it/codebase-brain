import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function ChangeInputPanel({ changeInput, onChangeInput, onUseExample, onAnalyze, analyzing }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading font-semibold text-sm text-slate-900">Change input</h2>
        <button type="button" className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer" onClick={onUseExample}>Use example</button>
      </div>
      <Textarea value={changeInput} onChange={(event) => onChangeInput(event.target.value)} rows={16} className="font-mono text-sm" placeholder="Paste a git diff, PR patch, or changed file list here…" />
      <Button onClick={onAnalyze} disabled={analyzing || !changeInput.trim()} className="gap-2 cursor-pointer">
        {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {analyzing ? "Analyzing…" : "Analyze Impact"}
      </Button>
    </div>
  );
}
