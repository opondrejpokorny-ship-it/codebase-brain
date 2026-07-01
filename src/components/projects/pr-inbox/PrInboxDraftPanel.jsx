// @ts-nocheck
import { Clipboard, Loader2, RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrInboxDraftPanel({ text = '', savedAt = null, copying = false, onChange = null, onCopy = null, onSave = null, onRegenerate = null }) {
  if (!text) return null;

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 space-y-2">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium text-slate-800">Editable draft</h3>
          <p className="text-xs text-slate-500">Review this local draft before copying or saving it.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onRegenerate} className="gap-1.5"><RotateCcw className="w-3.5 h-3.5" /> Regenerate</Button>
          <Button variant="outline" size="sm" onClick={onCopy} disabled={copying} className="gap-1.5">{copying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clipboard className="w-3.5 h-3.5" />} Copy</Button>
          <Button size="sm" onClick={onSave} className="gap-1.5"><Save className="w-3.5 h-3.5" /> Save</Button>
        </div>
      </div>
      <textarea value={text} onChange={(event) => onChange?.(event.target.value)} className="w-full min-h-72 rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-700 outline-none focus:ring-2 focus:ring-slate-300" />
      {savedAt && <p className="text-xs text-slate-500">Saved at {new Date(savedAt).toLocaleString()}.</p>}
    </div>
  );
}
