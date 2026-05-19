'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

interface OrgSettings {
  defaultGstMode: 'cgst_sgst' | 'igst';
  defaultIgstRate: number;
  defaultCgstRate: number;
  defaultSgstRate: number;
  allowCompanyOverride: boolean;
  allowBankOverride: boolean;
}

interface Sequence {
  id: string;
  billType: string;
  financialYear: string;
  prefix: string;
  typeCode: string;
  zeroPadding: number;
  currentValue: number;
  history: Array<{ id: string; previousValue: number; newValue: number; reason: string; performedAt: string }>;
}

interface Props {
  orgId: string;
  initialSettings: OrgSettings;
  initialSequences: Sequence[];
  canEdit: boolean;
}

const BILL_TYPE_LABELS: Record<string, string> = {
  invoice: 'Invoice',
  proforma: 'Proforma',
  credit_note: 'Credit Note',
  debit_note: 'Debit Note',
  delivery_challan: 'Delivery Challan',
  purchase_order: 'Purchase Order',
  quotation: 'Quotation',
};

export function OrgSettingsClient({ orgId, initialSettings, initialSequences, canEdit }: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [sequences, setSequences] = useState(initialSequences);
  const [saving, setSaving] = useState(false);
  const isDirty = JSON.stringify(settings) !== JSON.stringify(initialSettings);
  const [resetTarget, setResetTarget] = useState<Sequence | null>(null);
  const [resetValue, setResetValue] = useState('0');
  const [resetReason, setResetReason] = useState('');
  const [resetPrefix, setResetPrefix] = useState('');
  const [resetPadding, setResetPadding] = useState('4');
  const [expandedSeq, setExpandedSeq] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  async function handleSaveSettings() {
    setSaving(true);
    const res = await fetch(`/api/orgs/${orgId}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    if (res.ok) {
      toast.success('Settings saved');
    } else {
      const d = await res.json();
      toast.error(d.error || 'Failed to save');
    }
  }

  function openReset(seq: Sequence) {
    setResetTarget(seq);
    setResetValue(String(seq.currentValue));
    setResetReason('');
    setResetPrefix(seq.prefix);
    setResetPadding(String(seq.zeroPadding));
  }

  async function handleReset() {
    if (!resetTarget) return;
    setResetting(true);
    const res = await fetch(`/api/orgs/${orgId}/settings/sequences/${resetTarget.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resetToValue: parseInt(resetValue, 10),
        reason: resetReason,
        prefix: resetPrefix,
        zeroPadding: parseInt(resetPadding, 10),
      }),
    });
    setResetting(false);
    if (res.ok) {
      const updated = await res.json();
      setSequences((prev) => prev.map((s) => s.id === updated.id ? { ...s, ...updated } : s));
      setResetTarget(null);
      toast.success('Sequence updated');
    } else {
      const d = await res.json();
      toast.error(d.error || 'Failed to update');
    }
  }

  function formatBillNumber(seq: Sequence, value: number) {
    return `${seq.prefix}${seq.typeCode}-${seq.financialYear}-${String(value).padStart(seq.zeroPadding, '0')}`;
  }

  return (
    <div className="space-y-8">
      {/* GST Defaults */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">GST Defaults</h2>
        <div className="rounded-lg border divide-y">
          <div className="flex items-center justify-between px-4 py-4 gap-8">
            <div>
              <Label className="text-sm font-medium">Default GST Mode</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Used when creating new bills.</p>
            </div>
            <Select
              value={settings.defaultGstMode}
              onValueChange={(v) => v && setSettings((s) => ({ ...s, defaultGstMode: v as OrgSettings['defaultGstMode'] }))}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cgst_sgst">CGST + SGST (intra-state)</SelectItem>
                <SelectItem value="igst">IGST (inter-state)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {settings.defaultGstMode === 'igst' ? (
            <div className="flex items-center justify-between px-4 py-4 gap-8">
              <Label className="text-sm font-medium">Default IGST Rate (%)</Label>
              <Input
                type="number" min={0} max={100} step={0.5}
                value={settings.defaultIgstRate}
                onChange={(e) => setSettings((s) => ({ ...s, defaultIgstRate: parseFloat(e.target.value) || 0 }))}
                className="w-24 text-right"
              />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-4 py-4 gap-8">
                <Label className="text-sm font-medium">Default CGST Rate (%)</Label>
                <Input
                  type="number" min={0} max={50} step={0.5}
                  value={settings.defaultCgstRate}
                  onChange={(e) => setSettings((s) => ({ ...s, defaultCgstRate: parseFloat(e.target.value) || 0 }))}
                  className="w-24 text-right"
                />
              </div>
              <div className="flex items-center justify-between px-4 py-4 gap-8">
                <Label className="text-sm font-medium">Default SGST Rate (%)</Label>
                <Input
                  type="number" min={0} max={50} step={0.5}
                  value={settings.defaultSgstRate}
                  onChange={(e) => setSettings((s) => ({ ...s, defaultSgstRate: parseFloat(e.target.value) || 0 }))}
                  className="w-24 text-right"
                />
              </div>
            </>
          )}
        </div>
      </section>

      {/* Override Toggles */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Per-Bill Overrides</h2>
        <div className="rounded-lg border divide-y">
          <div className="flex items-center justify-between px-4 py-4">
            <div>
              <Label className="text-sm font-medium">Allow company override</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Let users pick a different billing company per bill.</p>
            </div>
            <Switch
              checked={settings.allowCompanyOverride}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, allowCompanyOverride: v }))}
              disabled={!canEdit}
            />
          </div>
          <div className="flex items-center justify-between px-4 py-4">
            <div>
              <Label className="text-sm font-medium">Allow bank account override</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Let users pick a different bank account per bill.</p>
            </div>
            <Switch
              checked={settings.allowBankOverride}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, allowBankOverride: v }))}
              disabled={!canEdit}
            />
          </div>
        </div>
      </section>

      {canEdit && (
        <Button onClick={handleSaveSettings} disabled={saving || !isDirty}>{saving ? 'Saving…' : 'Save Settings'}</Button>
      )}

      <Separator />

      {/* Invoice Sequences */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Invoice Sequences</h2>
          <p className="text-xs text-muted-foreground mt-1">Auto-assigned bill numbers per type and financial year. Sequences are created the first time a bill of that type is saved.</p>
        </div>

        {sequences.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sequences yet. They're created automatically when bills are first saved.</p>
        ) : (
          <div className="border rounded-lg divide-y">
            {sequences.map((seq) => (
              <div key={seq.id}>
                <div className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-1 flex items-center gap-3">
                    <span className="font-medium text-sm">{BILL_TYPE_LABELS[seq.billType] ?? seq.billType}</span>
                    <Badge variant="secondary" className="text-xs">{seq.financialYear.slice(0, 2)}-{seq.financialYear.slice(2)}</Badge>
                    <span className="text-xs text-muted-foreground font-mono">
                      Next: {formatBillNumber(seq, seq.currentValue + 1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => setExpandedSeq(expandedSeq === seq.id ? null : seq.id)}
                    >
                      {expandedSeq === seq.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    {canEdit && (
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => openReset(seq)}>
                        <RotateCcw className="h-3.5 w-3.5" />
                        Adjust
                      </Button>
                    )}
                  </div>
                </div>

                {expandedSeq === seq.id && seq.history.length > 0 && (
                  <div className="px-4 pb-3 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Recent history</p>
                    {seq.history.map((h) => (
                      <div key={h.id} className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-mono">{h.previousValue} → {h.newValue}</span>
                        <span className="flex-1">{h.reason}</span>
                        <span>{new Date(h.performedAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reset dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Sequence — {resetTarget ? (BILL_TYPE_LABELS[resetTarget.billType] ?? resetTarget.billType) : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Current value → set to</Label>
              <Input type="number" min={0} value={resetValue} onChange={(e) => setResetValue(e.target.value)} />
              {resetTarget && (
                <p className="text-xs text-muted-foreground">Next bill number will be: <span className="font-mono">{formatBillNumber(resetTarget, parseInt(resetValue || '0', 10) + 1)}</span></p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prefix</Label>
                <Input value={resetPrefix} onChange={(e) => setResetPrefix(e.target.value)} placeholder="empty" />
              </div>
              <div className="space-y-1.5">
                <Label>Zero padding</Label>
                <Input type="number" min={1} max={8} value={resetPadding} onChange={(e) => setResetPadding(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason *</Label>
              <Textarea value={resetReason} onChange={(e) => setResetReason(e.target.value)} placeholder="e.g. New financial year reset" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>Cancel</Button>
            <Button
              disabled={!resetReason.trim() || resetting}
              onClick={handleReset}
            >
              {resetting ? 'Saving…' : 'Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
