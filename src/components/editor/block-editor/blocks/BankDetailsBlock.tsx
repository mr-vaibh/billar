'use client';
import { useCallback, useState, useEffect } from 'react';
import { useBillStore } from '@/store/billStore';
import { useOrgSafe } from '@/components/layout/OrgProvider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Block, BankDetailsData } from '@/types/bill';
import { CreditCard, Loader2 } from 'lucide-react';

interface AccountOption {
  id: string; label: string; bankName: string; accountNumber: string;
  ifscCode: string; accountType: string; branchName: string;
  accountHolderName: string; upiId: string | null; qrCodeBase64: string | null;
}

interface Props { block: Block & { type: 'bank_details' } }

export function BankDetailsBlock({ block }: Props) {
  const { updateBlock } = useBillStore();
  const org = useOrgSafe();
  const d = block.data;
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [accountsLoaded, setAccountsLoaded] = useState(false);

  const update = useCallback((patch: Partial<BankDetailsData>) => {
    updateBlock(block.id, { ...d, ...patch });
  }, [block.id, d, updateBlock]);

  useEffect(() => {
    if (!org || accountsLoaded) return;
    setLoadingAccounts(true);
    fetch(`/api/orgs/${org.orgId}/financial-accounts`)
      .then((r) => r.json())
      .then((data) => {
        setAccounts(data.filter((a: { isActive: boolean }) => a.isActive));
        setAccountsLoaded(true);
      })
      .catch(() => {})
      .finally(() => setLoadingAccounts(false));
  }, [org?.orgId]); // eslint-disable-line

  function fillFromAccount(accountId: string) {
    const a = accounts.find((a) => a.id === accountId);
    if (!a) return;
    updateBlock(block.id, {
      ...d,
      accountHolderName: a.accountHolderName,
      bankName: a.bankName,
      accountNumber: a.accountNumber,
      ifscCode: a.ifscCode,
      accountType: a.accountType as BankDetailsData['accountType'],
      branchName: a.branchName,
      upiId: a.upiId ?? '',
      qrCodeImage: a.qrCodeBase64 ?? undefined,
    });
  }

  return (
    <div className="space-y-4">
      {org && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md border border-dashed">
          <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground flex-1">Fill from account master</span>
          <Select onValueChange={(v) => { if (typeof v === 'string') fillFromAccount(v); }}>
            <SelectTrigger className="h-7 w-52 text-xs">
              {loadingAccounts ? (
                <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Loading…</span>
              ) : (
                <SelectValue placeholder="Pick an account…" />
              )}
            </SelectTrigger>
            <SelectContent>
              {accounts.length === 0 && accountsLoaded && (
                <SelectItem value="__none__" disabled>No active accounts</SelectItem>
              )}
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.label} — {a.bankName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Account Holder Name *</Label>
          <Input value={d.accountHolderName} onChange={(e) => update({ accountHolderName: e.target.value })} placeholder="Name as per bank records" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Bank Name *</Label>
          <Input value={d.bankName} onChange={(e) => update({ bankName: e.target.value })} placeholder="State Bank of India" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Account Number *</Label>
          <Input value={d.accountNumber} onChange={(e) => update({ accountNumber: e.target.value })} placeholder="00000000000000" className="font-mono text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">IFSC Code *</Label>
          <Input value={d.ifscCode} onChange={(e) => update({ ifscCode: e.target.value.toUpperCase() })} placeholder="SBIN0001234" maxLength={11} className="font-mono text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Account Type *</Label>
          <Select value={d.accountType} onValueChange={(v) => v && update({ accountType: v as BankDetailsData['accountType'] })}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="savings" className="text-xs">Savings</SelectItem>
              <SelectItem value="current" className="text-xs">Current</SelectItem>
              <SelectItem value="cc" className="text-xs">Cash Credit</SelectItem>
              <SelectItem value="od" className="text-xs">Overdraft</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Branch Name</Label>
          <Input value={d.branchName} onChange={(e) => update({ branchName: e.target.value })} placeholder="Branch name" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">UPI ID (optional)</Label>
          <Input value={d.upiId || ''} onChange={(e) => update({ upiId: e.target.value })} placeholder="yourname@upi" className="font-mono text-xs" />
        </div>
      </div>
    </div>
  );
}
