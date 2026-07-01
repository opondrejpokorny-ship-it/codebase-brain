import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Save, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DEFAULT_WORKSPACE_OPTIONS, readWorkspaceOptions, resetWorkspaceOptions, writeWorkspaceOptions } from '@/lib/workspaceOptionsUtils';

export default function WorkspaceOptions() {
  const [options, setOptions] = useState(() => readWorkspaceOptions());
  const [saved, setSaved] = useState(false);

  function updateOption(key, value) {
    setOptions((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    writeWorkspaceOptions(options);
    setOptions(readWorkspaceOptions());
    setSaved(true);
  }

  function handleReset() {
    resetWorkspaceOptions();
    setOptions(DEFAULT_WORKSPACE_OPTIONS);
    setSaved(false);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link to="/workspace/quality" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> Workspace quality
        </Link>
        <h1 className="font-heading text-2xl font-bold text-slate-900 flex items-center gap-2">
          <SlidersHorizontal className="w-6 h-6" /> Workspace Options
        </h1>
        <p className="text-slate-500 mt-1 max-w-2xl">Local workspace-level preferences for quality targets, review rhythm, and team notes.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Workspace name</span>
            <input
              value={options.workspace_name}
              onChange={(event) => updateOption('workspace_name', event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              placeholder="Codebase Brain Workspace"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Quality target</span>
            <input
              type="number"
              min="0"
              max="100"
              value={options.quality_target}
              onChange={(event) => updateOption('quality_target', event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            />
          </label>
        </div>

        <label className="space-y-1.5 block">
          <span className="text-sm font-medium text-slate-700">Review cadence</span>
          <select
            value={options.review_cadence}
            onChange={(event) => updateOption('review_cadence', event.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>

        <label className="space-y-1.5 block">
          <span className="text-sm font-medium text-slate-700">Team notes</span>
          <textarea
            value={options.team_notes}
            onChange={(event) => updateOption('team_notes', event.target.value)}
            className="w-full min-h-32 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            placeholder="Add onboarding notes, quality expectations, repo ownership, or review process reminders."
          />
        </label>

        {saved && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Workspace options saved locally.</div>}

        <div className="flex flex-col sm:flex-row gap-2 justify-end">
          <Button variant="outline" onClick={handleReset} className="gap-1.5 cursor-pointer">
            <RotateCcw className="w-4 h-4" /> Reset
          </Button>
          <Button onClick={handleSave} className="gap-1.5 cursor-pointer">
            <Save className="w-4 h-4" /> Save options
          </Button>
        </div>
      </div>
    </div>
  );
}
