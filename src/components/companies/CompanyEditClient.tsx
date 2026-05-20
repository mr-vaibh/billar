'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CompanyForm } from './CompanyForm';
import { PlusCircle, Pencil, Trash2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface Account {
  id: string;
  label: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountType: string;
  branchName: string;
  accountHolderName: string;
  upiId: string;
  isActive: boolean;
}

interface Company {
  id: string;
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
  isActive: boolean;
}

interface Props {
  orgId: string;
  company: Company;
  accounts: Account[];
  canEdit: boolean;
  canDelete: boolean;
}

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  savings: 'Savings', current: 'Current', cc: 'Cash Credit', od: 'Overdraft',
};

export function CompanyEditClient({ orgId, company, accounts: initial, canEdit, canDelete }: Props) {
  const router = useRouter();
  const [accounts, setAccounts] = useState(initial);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function handleDeleteAccount(id: string) {
    setDeletingId(id);
    await fetch(`/api/orgs/${orgId}/bank-accounts/${id}`, { method: 'DELETE' });
    setAccounts((prev) => prev.map((a) => a.id === id ? { ...a, isActive: false } : a));
    setDeletingId(null);
    setConfirmId(null);
  }

  const confirmAccount = accounts.find((a) => a.id === confirmId);

  return (
    <Tabs defaultValue="details">
      <TabsList>
        <TabsTrigger value="details">Company Details</TabsTrigger>
        <TabsTrigger value="accounts">Bank Accounts ({accounts.filter((a) => a.isActive).length})</TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="pt-4">
        {canEdit ? (
          <CompanyForm orgId={orgId} companyId={company.id} initial={company} />
        ) : (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <DetailRow label="Name" value={company.name} />
            <DetailRow label="GSTIN" value={company.gstin} mono />
            <DetailRow label="PAN" value={company.pan} mono />
            <DetailRow label="CIN" value={company.cin} mono />
            <DetailRow label="Address" value={`${company.address}, ${company.city}, ${company.state} — ${company.pincode}`} cols />
            <DetailRow label="Phone" value={company.phone} />
            <DetailRow label="Email" value={company.email} />
            <DetailRow label="Website" value={company.website} />
          </div>
        )}
      </TabsContent>

      <TabsContent value="accounts" className="pt-4 space-y-4">
        <div className="flex justify-end">
          {canEdit && (
            <Link href={`/orgs/${orgId}/masters/bank-accounts/new?companyId=${company.id}`}>
              <Button size="sm" className="gap-2">
                <PlusCircle className="h-4 w-4" />
                Add Account
              </Button>
            </Link>
          )}
        </div>

        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No bank accounts linked to this company yet.</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">Label</th>
                  <th className="text-left px-4 py-3 font-medium">Bank</th>
                  <th className="text-left px-4 py-3 font-medium">Account No.</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{a.label}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.bankName}</td>
                    <td className="px-4 py-3 font-mono text-xs">{a.accountNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">{ACCOUNT_TYPE_LABEL[a.accountType] ?? a.accountType}</td>
                    <td className="px-4 py-3">
                      <Badge variant={a.isActive ? 'default' : 'secondary'}>
                        {a.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        {canEdit && (
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => router.push(`/orgs/${orgId}/masters/bank-accounts/${a.id}`)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canDelete && a.isActive && (
                          <Button
                            size="sm" variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setConfirmId(a.id)}
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
      </TabsContent>

      <Dialog open={!!confirmId} onOpenChange={() => setConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate account?</DialogTitle>
            <DialogDescription>
              <strong>{confirmAccount?.label}</strong> will be marked inactive.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!!deletingId}
              onClick={() => confirmId && handleDeleteAccount(confirmId)}
            >
              {deletingId ? 'Deactivating…' : 'Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}

function DetailRow({ label, value, mono, cols }: { label: string; value: string; mono?: boolean; cols?: boolean }) {
  return (
    <div className={cols ? 'col-span-2 space-y-0.5' : 'space-y-0.5'}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={mono ? 'font-mono text-xs' : ''}>{value || '—'}</p>
    </div>
  );
}
