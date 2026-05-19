'use client';
import { useSettingsStore } from '@/store/settingsStore';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export function SettingsClient() {
  const { autoSave, setAutoSave } = useSettingsStore();

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold mb-1">Settings</h1>
      <p className="text-sm text-muted-foreground mb-8">Preferences are saved in your browser.</p>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Editor</h2>
        <div className="rounded-lg border divide-y">
          <div className="flex items-center justify-between px-4 py-4">
            <div>
              <Label htmlFor="autosave-toggle" className="text-sm font-medium">Auto-save</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatically saves changes 2 seconds after you stop editing.
                When off, use Ctrl+S / ⌘+S to save manually.
              </p>
            </div>
            <Switch
              id="autosave-toggle"
              checked={autoSave}
              onCheckedChange={setAutoSave}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
