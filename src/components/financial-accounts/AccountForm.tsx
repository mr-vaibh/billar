'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface Company {
  id: string;
  name: string;
}

interface AccountFormData {
  companyId: string;
  label: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountType: string;
  branchName: string;
  accountHolderName: string;
  upiId: string;
  qrCodeBase64: string;
}

interface Props {
  orgId: string;
  accountId?: string;
  companies: Company[];
  initial?: Partial<AccountFormData>;
  defaultCompanyId?: string;
}

const EMPTY: AccountFormData = {
  companyId: '', label: '', bankName: '', accountNumber: '',
  ifscCode: '', accountType: 'current', branchName: '',
  accountHolderName: '', upiId: '', qrCodeBase64: '',
};

export function AccountForm({ orgId, accountId, companies, initial, defaultCompanyId }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<AccountFormData>({
    ...EMPTY,
    ...(defaultCompanyId ? { companyId: defaultCompanyId } : {}),
    ...initial,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(field: keyof AccountFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleQrChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set('qrCodeBase64', reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      ...form,
      companyId: form.companyId || null,
      upiId: form.upiId || null,
      qrCodeBase64: form.qrCodeBase64 || null,
    };

    const url = accountId
      ? `/api/orgs/${orgId}/financial-accounts/${accountId}`
      : `/api/orgs/${orgId}/financial-accounts`;
    const method = accountId ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || 'Something went wrong');
      return;
    }

    if (form.companyId) {
      router.push(`/orgs/${orgId}/masters/companies/${form.companyId}`);
    } else {
      router.push(`/orgs/${orgId}/masters/financial-accounts`);
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && <Alert variant="destructive">{error}</Alert>}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Linked Company</h2>
        <div className="space-y-1.5">
          <Label>Company (optional)</Label>
          <Select value={form.companyId} onValueChange={(v) => set('companyId', !v || v === '__none__' ? '' : v)}>
            <SelectTrigger>
              <span className={!form.companyId || form.companyId === '__none__' ? 'text-muted-foreground text-sm' : 'text-sm'}>
                {form.companyId && form.companyId !== '__none__'
                  ? companies.find((c) => c.id === form.companyId)?.name ?? form.companyId
                  : 'Not linked to any company'}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Not linked</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Account Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="label">Label *</Label>
            <Input id="label" value={form.label} onChange={(e) => set('label', e.target.value)} placeholder="e.g. Main Current Account" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="accountHolderName">Account Holder Name *</Label>
            <Input id="accountHolderName" value={form.accountHolderName} onChange={(e) => set('accountHolderName', e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Account Type *</Label>
            <Select value={form.accountType} onValueChange={(v) => v && set('accountType', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="savings">Savings</SelectItem>
                <SelectItem value="current">Current</SelectItem>
                <SelectItem value="cc">Cash Credit</SelectItem>
                <SelectItem value="od">Overdraft</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bankName">Bank Name *</Label>
            <Input id="bankName" value={form.bankName} onChange={(e) => set('bankName', e.target.value)} placeholder="State Bank of India" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="branchName">Branch Name *</Label>
            <Input id="branchName" value={form.branchName} onChange={(e) => set('branchName', e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="accountNumber">Account Number *</Label>
            <Input id="accountNumber" value={form.accountNumber} onChange={(e) => set('accountNumber', e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ifscCode">IFSC Code *</Label>
            <Input id="ifscCode" value={form.ifscCode} onChange={(e) => set('ifscCode', e.target.value.toUpperCase())} placeholder="SBIN0001234" required />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">UPI / QR</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="upiId">UPI ID</Label>
            <Input id="upiId" value={form.upiId} onChange={(e) => set('upiId', e.target.value)} placeholder="business@okaxis" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qr">QR Code Image</Label>
            {form.qrCodeBase64 && (
              <div className="flex items-center gap-3 mb-2">
                <img src={form.qrCodeBase64} alt="QR preview" className="h-16 w-16 border rounded object-contain" />
                <Button type="button" variant="outline" size="sm" onClick={() => set('qrCodeBase64', '')}>Remove</Button>
              </div>
            )}
            <Input id="qr" type="file" accept="image/*" onChange={handleQrChange} />
          </div>
        </div>
      </section>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : accountId ? 'Save Changes' : 'Create Account'}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
