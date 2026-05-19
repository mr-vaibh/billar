'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle } from 'lucide-react';

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function CreateOrgForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ orgId: string; orgName: string; email: string } | null>(null);

  function handleNameChange(v: string) {
    setName(v);
    if (!slugEdited) setSlug(toSlug(v));
  }

  function handleSlugChange(v: string) {
    setSlug(v);
    setSlugEdited(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, ownerEmail }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Something went wrong'); return; }
      setSuccess({ orgId: data.id, orgName: data.name, email: ownerEmail });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="border rounded-xl p-6 bg-background space-y-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-6 w-6 text-green-500 shrink-0" />
          <div>
            <p className="font-semibold">Organisation created</p>
            <p className="text-sm text-muted-foreground">
              An invite email has been sent to <strong>{success.email}</strong>. They'll set their own password from the link.
            </p>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={() => router.push('/admin')}>Back to list</Button>
          <Button onClick={() => router.push(`/admin/orgs/${success.orgId}`)}>View organisation</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 border rounded-xl p-6 bg-background">
      <div className="space-y-1.5">
        <Label htmlFor="name">Organisation name</Label>
        <Input id="name" required value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Acme Traders Pvt. Ltd." />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="slug">Slug <span className="text-muted-foreground font-normal">(URL identifier, lowercase)</span></Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground shrink-0">/orgs/</span>
          <Input
            id="slug"
            required
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="acme-traders"
            pattern="[a-z0-9-]+"
            title="Lowercase letters, numbers, and hyphens only"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ownerEmail">Owner email</Label>
        <Input id="ownerEmail" type="email" required value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="owner@client.com" />
        <p className="text-xs text-muted-foreground">An invite email will be sent to this address. They set their own password.</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Creating…' : 'Create organisation & send invite'}
      </Button>
    </form>
  );
}
