'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, IndianRupee } from 'lucide-react';

interface Payment {
  id: string; amount: number; paidAt: string; mode: string;
  reference: string | null; notes: string | null;
}

interface Props {
  orgId: string;
  billId: string;
  grandTotal: number;
  initialPayments: Payment[];
  canEdit: boolean;
}

const MODE_LABELS: Record<string, string> = {
  cash: 'Cash', upi: 'UPI', neft: 'NEFT', rtgs: 'RTGS', cheque: 'Cheque', other: 'Other',
};

export function PaymentPanel({ orgId, billId, grandTotal, initialPayments, canEdit }: Props) {
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ amount: '', paidAt: new Date().toISOString().slice(0, 10), mode: 'upi', reference: '', notes: '' });

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const outstanding = Math.max(0, grandTotal - totalPaid);

  function set(k: keyof typeof form, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleAdd() {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
    setSaving(true);
    const res = await fetch(`/api/orgs/${orgId}/bills/${billId}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, paidAt: new Date(form.paidAt).toISOString(), mode: form.mode, reference: form.reference || undefined, notes: form.notes || undefined }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { toast.error(data.error || 'Failed'); return; }
    setPayments((prev) => [data, ...prev]);
    setForm({ amount: '', paidAt: new Date().toISOString().slice(0, 10), mode: 'upi', reference: '', notes: '' });
    setAdding(false);
    toast.success('Payment recorded');
  }

  async function handleDelete(paymentId: string) {
    const res = await fetch(`/api/orgs/${orgId}/bills/${billId}/payments/${paymentId}`, { method: 'DELETE' });
    if (res.ok) {
      setPayments((prev) => prev.filter((p) => p.id !== paymentId));
      toast.success('Payment removed');
    } else {
      toast.error('Failed to remove');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Payments</h2>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">Total: <span className="font-mono font-medium text-foreground">₹{grandTotal.toFixed(2)}</span></span>
          <span className="text-muted-foreground">Paid: <span className="font-mono font-medium text-green-600">₹{totalPaid.toFixed(2)}</span></span>
          <Badge variant={outstanding === 0 ? 'secondary' : 'destructive'}>
            {outstanding === 0 ? 'Fully Paid' : `₹${outstanding.toFixed(2)} outstanding`}
          </Badge>
        </div>
      </div>

      <Separator />

      {payments.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground py-2">No payments recorded yet.</p>
      )}

      {payments.length > 0 && (
        <div className="divide-y border rounded-lg">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
              <IndianRupee className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium text-sm">₹{p.amount.toFixed(2)}</span>
                  <Badge variant="outline" className="text-xs">{MODE_LABELS[p.mode] ?? p.mode}</Badge>
                  {p.reference && <span className="text-xs text-muted-foreground">Ref: {p.reference}</span>}
                </div>
                {p.notes && <p className="text-xs text-muted-foreground mt-0.5">{p.notes}</p>}
              </div>
              <span className="text-xs text-muted-foreground">{new Date(p.paidAt).toLocaleDateString('en-IN')}</span>
              {canEdit && (
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-7 w-7 p-0" onClick={() => handleDelete(p.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {canEdit && !adding && (
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" />Record Payment
        </Button>
      )}

      {adding && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <h3 className="text-sm font-medium">New Payment</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Amount (₹) *</Label>
              <Input type="number" min={0.01} step={0.01} value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0.00" className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Date *</Label>
              <Input type="date" value={form.paidAt} onChange={(e) => set('paidAt', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mode *</Label>
              <Select value={form.mode} onValueChange={(v) => { if (typeof v === 'string') set('mode', v); }}>
                <SelectTrigger className="h-9 text-sm">
                  <span>{MODE_LABELS[form.mode]}</span>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MODE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reference / UTR</Label>
              <Input value={form.reference} onChange={(e) => set('reference', e.target.value)} placeholder="Transaction ID" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Input value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional notes" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={saving}>{saving ? 'Saving…' : 'Save Payment'}</Button>
            <Button size="sm" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
