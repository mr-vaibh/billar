'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';

interface CompanyFormData {
  name: string;
  gstin: string;
  pan: string;
  cin: string;
  tagline: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  website: string;
  logoBase64: string;
}

interface Props {
  orgId: string;
  companyId?: string;
  initial?: Partial<CompanyFormData>;
  onSaved?: (id: string) => void;
}

const EMPTY: CompanyFormData = {
  name: '', gstin: '', pan: '', cin: '', tagline: '',
  address: '', city: '', state: '', pincode: '',
  phone: '', email: '', website: '', logoBase64: '',
};

export function CompanyForm({ orgId, companyId, initial, onSaved }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<CompanyFormData>({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(field: keyof CompanyFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set('logoBase64', reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      ...form,
      gstin: form.gstin || undefined,
      pan: form.pan || undefined,
      cin: form.cin || undefined,
      tagline: form.tagline || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      website: form.website || undefined,
      logoBase64: form.logoBase64 || undefined,
    };

    const url = companyId
      ? `/api/orgs/${orgId}/companies/${companyId}`
      : `/api/orgs/${orgId}/companies`;
    const method = companyId ? 'PATCH' : 'POST';

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

    if (onSaved) {
      onSaved(data.id);
    } else {
      router.push(`/orgs/${orgId}/masters/companies`);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && <Alert variant="destructive">{error}</Alert>}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Basic Info</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="name">Company Name *</Label>
            <Input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tagline">Tagline</Label>
            <Input id="tagline" value={form.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="Optional" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gstin">GSTIN</Label>
            <Input id="gstin" value={form.gstin} onChange={(e) => set('gstin', e.target.value)} placeholder="22AAAAA0000A1Z5" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pan">PAN</Label>
            <Input id="pan" value={form.pan} onChange={(e) => set('pan', e.target.value)} placeholder="AAAAA0000A" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cin">CIN</Label>
            <Input id="cin" value={form.cin} onChange={(e) => set('cin', e.target.value)} placeholder="U12345MH2020PTC000000" />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Address</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="address">Street Address *</Label>
            <Textarea id="address" value={form.address} onChange={(e) => set('address', e.target.value)} rows={2} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">City *</Label>
            <Input id="city" value={form.city} onChange={(e) => set('city', e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="state">State *</Label>
            <Input id="state" value={form.state} onChange={(e) => set('state', e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pincode">Pincode *</Label>
            <Input id="pincode" value={form.pincode} onChange={(e) => set('pincode', e.target.value)} required />
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
            <Input id="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="billing@company.com" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="website">Website</Label>
            <Input id="website" value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://company.com" />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Logo</h2>
        {form.logoBase64 && (
          <div className="flex items-center gap-4">
            <img src={form.logoBase64} alt="Logo preview" className="h-16 w-auto border rounded object-contain" />
            <Button type="button" variant="outline" size="sm" onClick={() => set('logoBase64', '')}>Remove</Button>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="logo">Upload Logo</Label>
          <Input id="logo" type="file" accept="image/*" onChange={handleLogoChange} />
          <p className="text-xs text-muted-foreground">PNG or JPG, will be stored as base64. Recommended: under 200 KB.</p>
        </div>
      </section>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : companyId ? 'Save Changes' : 'Create Company'}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
