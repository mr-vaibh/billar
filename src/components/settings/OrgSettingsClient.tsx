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

interface SequenceHistoryEntry {
  id: string;
  previousValue: number;
  newValue: number;
  previousPrefix: string;
  newPrefix: string;
  previousTypeCode: string;
  newTypeCode: string;
  previousZeroPadding: number;
  newZeroPadding: number;
  reason: string;
  performedAt: string;
}

interface Sequence {
  id: string;
  billType: string;
  financialYear: string;
  prefix: string;
  typeCode: string;
  zeroPadding: number;
  currentValue: number;
  history: SequenceHistoryEntry[];
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
  const [savedSettings, setSavedSettings] = useState(initialSettings);
  const [sequences, setSequences] = useState(initialSequences);
  const [saving, setSaving] = useState(false);
  const isDirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);
  const [resetTarget, setResetTarget] = useState<Sequence | null>(null);
  const [resetValue, setResetValue] = useState('0');
  const [resetReason, setResetReason] = useState('');
  const [resetPrefix, setResetPrefix] = useState('');
  const [resetTypeCode, setResetTypeCode] = useState('');
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
      setSavedSettings(settings);
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
    setResetTypeCode(seq.typeCode);
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
        typeCode: resetTypeCode.toUpperCase(),
        zeroPadding: parseInt(resetPadding, 10),
      }),
    });
    setResetting(false);
    if (res.ok) {
      const updated = await res.json();
      setSequences((prev) => prev.map((s) => s.id === updated.id ? updated : s));
      setResetTarget(null);
      toast.success('Sequence updated');
    } else {
      const d = await res.json();
      toast.error(d.error || 'Failed to update');
    }
  }

  const ALPHANUM = /^[A-Z0-9]*$/;
  const prefixError = resetPrefix && !ALPHANUM.test(resetPrefix)
    ? 'Only uppercase letters and numbers allowed'
    : resetPrefix.length > 5
    ? 'Max 5 characters'
    : null;
  const typeCodeError = !resetTypeCode.trim()
    ? 'Required'
    : !ALPHANUM.test(resetTypeCode)
    ? 'Only uppercase letters and numbers allowed'
    : resetTypeCode.length > 10
    ? 'Max 10 characters'
    : null;

  function formatBillNumber(seq: Sequence, value: number) {
    return `${seq.prefix}${seq.typeCode}-${seq.financialYear}-${String(value).padStart(seq.zeroPadding, '0')}`;
  }

  function formatPreview(value: number) {
    if (!resetTarget) return '';
    const pad = Math.max(1, parseInt(resetPadding, 10) || 1);
    const tc = resetTypeCode.toUpperCase() || resetTarget.typeCode;
    return `${resetPrefix}${tc}-${resetTarget.financialYear}-${String(value).padStart(pad, '0')}`;
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
          <p className="text-xs text-muted-foreground mt-1">
            Bill numbers are assigned when a bill is finalized. Sequences are created automatically per bill type and financial year.
          </p>
        </div>

        {sequences.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No sequences yet — they're created automatically the first time a bill is finalized.</p>
        ) : (
          <div className="border rounded-lg divide-y">
            {sequences.map((seq) => (
              <div key={seq.id}>
                {/* Sequence header row */}
                <div className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{BILL_TYPE_LABELS[seq.billType] ?? seq.billType}</span>
                      <Badge variant="secondary" className="text-xs font-mono">{seq.financialYear.slice(0, 2)}-{seq.financialYear.slice(2)}</Badge>
                      {seq.prefix && (
                        <Badge variant="outline" className="text-xs font-mono">prefix: {seq.prefix}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">Next:</span>
                      <span className="text-sm font-mono font-semibold tracking-wide">{formatBillNumber(seq, seq.currentValue + 1)}</span>
                      <span className="text-xs text-muted-foreground">(counter at {seq.currentValue})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {seq.history.length > 0 && (
                      <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={() => setExpandedSeq(expandedSeq === seq.id ? null : seq.id)}>
                        {expandedSeq === seq.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        History
                      </Button>
                    )}
                    {canEdit && (
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => openReset(seq)}>
                        <RotateCcw className="h-3.5 w-3.5" />
                        Adjust
                      </Button>
                    )}
                  </div>
                </div>

                {/* History rows */}
                {expandedSeq === seq.id && seq.history.length > 0 && (
                  <div className="bg-muted/30 border-t px-4 py-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Adjustment history</p>
                    {seq.history.map((h) => {
                      const fromPrefix = h.previousPrefix  ?? '';
                      const toPrefix   = h.newPrefix       ?? '';
                      const fromCode   = h.previousTypeCode || seq.typeCode;
                      const toCode     = h.newTypeCode     || seq.typeCode;
                      const fromPad    = h.previousZeroPadding ?? seq.zeroPadding;
                      const toPad      = h.newZeroPadding      ?? seq.zeroPadding;
                      const fmtFrom = `${fromPrefix}${fromCode}-${seq.financialYear}-${String(h.previousValue).padStart(fromPad, '0')}`;
                      const fmtTo   = `${toPrefix}${toCode}-${seq.financialYear}-${String(h.newValue).padStart(toPad, '0')}`;
                      return (
                        <div key={h.id} className="flex items-center gap-3 text-xs">
                          <div className="flex items-center gap-1.5 font-mono shrink-0">
                            <span className="text-muted-foreground">{fmtFrom}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-semibold text-foreground">{fmtTo}</span>
                          </div>
                          <span className="flex-1 text-muted-foreground truncate">{h.reason}</span>
                          <span className="text-muted-foreground shrink-0">{new Date(h.performedAt).toLocaleDateString()}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Adjust dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Adjust Sequence — {resetTarget ? (BILL_TYPE_LABELS[resetTarget.billType] ?? resetTarget.billType) : ''}
            </DialogTitle>
          </DialogHeader>

          {/* Live preview */}
          <div className="rounded-lg bg-muted px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Next bill number will be</p>
            <p className="text-xl font-mono font-bold tracking-wider">{formatPreview(parseInt(resetValue || '0', 10) + 1)}</p>
          </div>

          <div className="space-y-4">
            {/* Format row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Prefix</Label>
                <Input
                  value={resetPrefix}
                  onChange={(e) => setResetPrefix(e.target.value.toUpperCase())}
                  placeholder="none"
                  maxLength={5}
                  className={`font-mono ${prefixError ? 'border-destructive' : ''}`}
                />
                {prefixError
                  ? <p className="text-xs text-destructive">{prefixError}</p>
                  : <p className="text-xs text-muted-foreground">Optional. e.g. A → AINV</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Type code</Label>
                <Input
                  value={resetTypeCode}
                  onChange={(e) => setResetTypeCode(e.target.value.toUpperCase())}
                  placeholder="INV"
                  maxLength={10}
                  className={`font-mono ${typeCodeError ? 'border-destructive' : ''}`}
                />
                {typeCodeError
                  ? <p className="text-xs text-destructive">{typeCodeError}</p>
                  : <p className="text-xs text-muted-foreground">e.g. INV, TAX, BILL</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Zero padding</Label>
                <Input
                  type="number" min={1} max={8}
                  value={resetPadding}
                  onKeyDown={(e) => { if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault(); }}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    setResetPadding(!isNaN(v) && v > 8 ? '8' : e.target.value);
                  }}
                  onBlur={(e) => {
                    const v = parseInt(e.target.value, 10);
                    setResetPadding(String(isNaN(v) ? 1 : Math.min(8, Math.max(1, v))));
                  }}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">digits: 4 → 0001</p>
              </div>
            </div>

            {/* Counter */}
            <div className="space-y-1.5">
              <Label className="text-xs">Set counter to</Label>
              <Input
                type="number" min={0} max={999999}
                value={resetValue}
                onKeyDown={(e) => { if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault(); }}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setResetValue(!isNaN(v) && v > 999999 ? '999999' : e.target.value);
                }}
                onBlur={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setResetValue(String(isNaN(v) ? 0 : Math.min(999999, Math.max(0, v))));
                }}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">Current counter: {resetTarget?.currentValue}. Next bill uses counter + 1.</p>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label className="text-xs">Reason <span className="text-destructive">*</span></Label>
              <Textarea
                value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
                placeholder="e.g. Correcting series after migration"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>Cancel</Button>
            <Button disabled={
              !resetReason.trim() ||
              !!prefixError ||
              !!typeCodeError ||
              resetting ||
              (
                parseInt(resetValue, 10) === resetTarget?.currentValue &&
                resetPrefix === resetTarget?.prefix &&
                resetTypeCode.toUpperCase() === resetTarget?.typeCode &&
                parseInt(resetPadding, 10) === resetTarget?.zeroPadding
              )
            } onClick={handleReset}>
              {resetting ? 'Saving…' : 'Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
