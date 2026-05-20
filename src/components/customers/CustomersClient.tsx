'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Search, Pencil, UserX } from 'lucide-react';
import { toast } from 'sonner';

interface Customer {
  id: string; name: string; gstin: string | null; email: string | null;
  phone: string | null; city: string | null; state: string | null; isActive: boolean;
}

export function CustomersClient({ orgId, initialCustomers }: { orgId: string; initialCustomers: Customer[] }) {
  const router = useRouter();
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState('');
  const [deactivateTarget, setDeactivateTarget] = useState<Customer | null>(null);

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.gstin?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDeactivate() {
    if (!deactivateTarget) return;
    const res = await fetch(`/api/orgs/${orgId}/customers/${deactivateTarget.id}`, { method: 'DELETE' });
    if (res.ok) {
      setCustomers((prev) => prev.filter((c) => c.id !== deactivateTarget.id));
      toast.success('Customer deactivated');
    } else {
      toast.error('Failed to deactivate');
    }
    setDeactivateTarget(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search customers…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Link href={`/orgs/${orgId}/masters/customers/new`}>
          <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />Add Customer</Button>
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          {search ? 'No customers match your search.' : 'No customers yet. Add your first one.'}
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {filtered.map((c) => (
            <div key={c.id} className="flex items-center gap-4 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{c.name}</span>
                  {c.gstin && <Badge variant="outline" className="text-xs font-mono">{c.gstin}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {[c.city, c.state].filter(Boolean).join(', ')}
                  {c.email && ` · ${c.email}`}
                  {c.phone && ` · ${c.phone}`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => router.push(`/orgs/${orgId}/masters/customers/${c.id}`)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeactivateTarget(c)}>
                  <UserX className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!deactivateTarget} onOpenChange={(o) => !o && setDeactivateTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Deactivate Customer</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Deactivate <strong>{deactivateTarget?.name}</strong>? They won't appear in auto-fill suggestions.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeactivate}>Deactivate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
