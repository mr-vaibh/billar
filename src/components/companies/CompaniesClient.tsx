'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Pencil, Trash2, Building2, CreditCard } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface CompanyRow {
  id: string;
  name: string;
  gstin: string | null;
  city: string;
  state: string;
  isActive: boolean;
  accountCount: number;
}

interface Props {
  orgId: string;
  companies: CompanyRow[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export function CompaniesClient({ orgId, companies: initial, canCreate, canEdit, canDelete }: Props) {
  const router = useRouter();
  const [companies, setCompanies] = useState(initial);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeleting(id);
    await fetch(`/api/orgs/${orgId}/companies/${id}`, { method: 'DELETE' });
    setCompanies((prev) => prev.map((c) => c.id === id ? { ...c, isActive: false } : c));
    setDeleting(null);
    setConfirmId(null);
  }

  const confirmCompany = companies.find((c) => c.id === confirmId);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Companies</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your billing company profiles.</p>
        </div>
        {canCreate && (
          <Link href={`/orgs/${orgId}/masters/companies/new`}>
            <Button size="sm" className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Add Company
            </Button>
          </Link>
        )}
      </div>

      {companies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <Building2 className="h-10 w-10 opacity-30" />
          <p className="text-sm">No companies yet.</p>
          {canCreate && (
            <Link href={`/orgs/${orgId}/masters/companies/new`}>
              <Button size="sm" variant="outline">Add your first company</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">GSTIN</th>
                <th className="text-left px-4 py-3 font-medium">Location</th>
                <th className="text-left px-4 py-3 font-medium">Accounts</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{c.gstin || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.city}, {c.state}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <CreditCard className="h-3.5 w-3.5" />
                      {c.accountCount}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={c.isActive ? 'default' : 'secondary'}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {canEdit && (
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => router.push(`/orgs/${orgId}/masters/companies/${c.id}`)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {canDelete && c.isActive && (
                        <Button
                          size="sm" variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setConfirmId(c.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!confirmId} onOpenChange={() => setConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate company?</DialogTitle>
            <DialogDescription>
              <strong>{confirmCompany?.name}</strong> will be marked inactive. Existing bills using this company won't be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!!deleting}
              onClick={() => confirmId && handleDelete(confirmId)}
            >
              {deleting ? 'Deactivating…' : 'Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
