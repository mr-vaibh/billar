'use client';
import { useCallback } from 'react';
import { useBillStore } from '@/store/billStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Block, BankDetailsData } from '@/types/bill';

interface Props { block: Block & { type: 'bank_details' } }

export function BankDetailsBlock({ block }: Props) {
  const { updateBlock } = useBillStore();
  const d = block.data;

  const update = useCallback((patch: Partial<BankDetailsData>) => {
    updateBlock(block.id, { ...d, ...patch });
  }, [block.id, d, updateBlock]);

  return (
    <div className="space-y-4">
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
