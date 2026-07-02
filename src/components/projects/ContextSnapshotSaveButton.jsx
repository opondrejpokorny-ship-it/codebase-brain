// @ts-nocheck
import { useState } from 'react';
import { Check, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { saveContextSnapshot } from '@/lib/contextSnapshotUtils';
import { canWriteEntity } from '@/lib/optionalEntityRuntime';

function sourceLabel(source = '') {
  if (source === 'persisted_storage') return 'persisted';
  if (source === 'local_fallback') return 'fallback';
  return source || '';
}

export default function ContextSnapshotSaveButton({ projectId = null, contextPack = null, metadata = {}, className = '' }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveSource, setSaveSource] = useState('');
  const canSave = Boolean(projectId && contextPack && canWriteEntity('ContextPack'));

  if (!canSave) return null;

  const saveSnapshot = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const result = await saveContextSnapshot(projectId, contextPack, metadata);
      setSaved(true);
      setSaveSource(result.source || 'unknown');
      toast({
        title: result.persisted ? 'Context snapshot saved' : 'Context snapshot kept as fallback',
        description: result.persisted ? 'The selected context pack was saved to optional storage.' : `Persistence source: ${sourceLabel(result.source)}.`,
      });
    } catch (error) {
      setSaveSource('error');
      toast({ title: 'Context snapshot not saved', description: error?.message || 'Optional storage is unavailable.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={saveSnapshot} disabled={saving} className={`h-8 gap-1.5 cursor-pointer text-xs ${className}`} title={saveSource ? `Last save source: ${sourceLabel(saveSource)}` : undefined}>
      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
      {saved ? `Saved${sourceLabel(saveSource) ? ` · ${sourceLabel(saveSource)}` : ''}` : saving ? 'Saving' : 'Save snapshot'}
    </Button>
  );
}
