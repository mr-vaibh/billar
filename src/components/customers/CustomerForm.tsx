'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';

interface CustomerFormData {
  name: string; gstin: string; pan: string; address: string;
  city: string; state: string; pincode: string; phone: string; email: string;
}

interface Props {
  orgId: string;
  customerId?: string;
  initial?: Partial<CustomerFormData>;
}

const EMPTY: CustomerFormData = { name: '', gstin: '', pan: '', address: '', city: '', state: '', pincode: '', phone: '', email: '' };

export function CustomerForm({ orgId, customerId, initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<CustomerFormData>({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(field: keyof CustomerFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const url = customerId
      ? `/api/orgs/${orgId}/customers/${customerId}`
      : `/api/orgs/${orgId}/customers`;
    const method = customerId ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, gstin: form.gstin || null, pan: form.pan || null, email: form.email || null }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) { setError(data.error || 'Something went wrong'); return; }

    router.push(`/orgs/${orgId}/masters/customers`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && <Alert variant="destructive">{error}</Alert>}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Basic Info</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Customer / Company name" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gstin">GSTIN</Label>
            <Input id="gstin" value={form.gstin} onChange={(e) => set('gstin', e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" maxLength={15} className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pan">PAN</Label>
            <Input id="pan" value={form.pan} onChange={(e) => set('pan', e.target.value.toUpperCase())} placeholder="AAAAA0000A" maxLength={10} className="font-mono" />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Address</h2>
        <div className="space-y-1.5">
          <Label htmlFor="address">Street Address</Label>
          <Input id="address" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="123, Main Street" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="city">City</Label>
            <Input id="city" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Mumbai" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="state">State</Label>
            <Input id="state" value={form.state} onChange={(e) => set('state', e.target.value)} placeholder="Maharashtra" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pincode">PIN Code</Label>
            <Input id="pincode" value={form.pincode} onChange={(e) => set('pincode', e.target.value)} placeholder="400001" maxLength={6} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contact</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 98765 43210" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="contact@company.com" />
          </div>
        </div>
      </section>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : customerId ? 'Save Changes' : 'Create Customer'}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
