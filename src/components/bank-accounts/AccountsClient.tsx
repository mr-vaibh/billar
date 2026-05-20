'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Pencil, Trash2, CreditCard } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface AccountRow {
  id: string;
  label: string;
  bankName: string;
  accountNumber: string;
  accountType: string;
  accountHolderName: string;
  isActive: boolean;
  company: { id: string; name: string } | null;
}

interface Props {
  orgId: string;
  accounts: AccountRow[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

const TYPE_LABEL: Record<string, string> = {
  savings: 'Savings', current: 'Current', cc: 'Cash Credit', od: 'Overdraft',
};

export function AccountsClient({ orgId, accounts: initial, canCreate, canEdit, canDelete }: Props) {
  const router = useRouter();
  const [accounts, setAccounts] = useState(initial);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch(`/api/orgs/${orgId}/bank-accounts/${id}`, { method: 'DELETE' });
    setAccounts((prev) => prev.map((a) => a.id === id ? { ...a, isActive: false } : a));
    setDeletingId(null);
    setConfirmId(null);
  }

  const confirmAccount = accounts.find((a) => a.id === confirmId);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bank Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">Bank accounts used on bills.</p>
        </div>
        {canCreate && (
          <Link href={`/orgs/${orgId}/masters/bank-accounts/new`}>
            <Button size="sm" className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Add Account
            </Button>
          </Link>
        )}
      </div>

      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <CreditCard className="h-10 w-10 opacity-30" />
          <p className="text-sm">No bank accounts yet.</p>
          {canCreate && (
            <Link href={`/orgs/${orgId}/masters/bank-accounts/new`}>
              <Button size="sm" variant="outline">Add your first account</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium">Label</th>
                <th className="text-left px-4 py-3 font-medium">Bank</th>
                <th className="text-left px-4 py-3 font-medium">Account No.</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Company</th>
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
                  <td className="px-4 py-3 text-muted-foreground">{TYPE_LABEL[a.accountType] ?? a.accountType}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {a.company ? (
                      <Link
                        href={`/orgs/${orgId}/masters/companies/${a.company.id}`}
                        className="hover:underline text-foreground"
                      >
                        {a.company.name}
                      </Link>
                    ) : '—'}
                  </td>
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
              onClick={() => confirmId && handleDelete(confirmId)}
            >
              {deletingId ? 'Deactivating…' : 'Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
