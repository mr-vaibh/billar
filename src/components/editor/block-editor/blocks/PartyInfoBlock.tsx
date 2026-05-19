'use client';
import { useCallback } from 'react';
import { useBillStore } from '@/store/billStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Block, PartyDetails, PartyInfoData } from '@/types/bill';
import { INDIAN_STATES } from '@/features/bills/billUtils';

interface Props { block: Block & { type: 'party_info' } }

function PartyForm({ label, party, onChange }: { label: string; party: PartyDetails; onChange: (p: Partial<PartyDetails>) => void }) {
  return (
    <div className="flex-1 min-w-0 space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</h4>
      <div className="space-y-1">
        <Label className="text-xs">Name *</Label>
        <Input value={party.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Company / Person Name" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Address</Label>
        <Input value={party.address} onChange={(e) => onChange({ address: e.target.value })} placeholder="Street address" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">City</Label>
          <Input value={party.city} onChange={(e) => onChange({ city: e.target.value })} placeholder="City" />
        </div>
        <div className="space-y-1 col-span-2">
          <Label className="text-xs">State</Label>
          <Select value={party.stateCode || ''} onValueChange={(v) => { if (!v) return;
            const state = INDIAN_STATES.find((s) => s.code === v);
            onChange({ stateCode: v, state: state?.name || '' });
          }}>
            <SelectTrigger className="text-xs h-9">
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {INDIAN_STATES.map((s) => <SelectItem key={s.code} value={s.code} className="text-xs">{s.code} - {s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">PIN Code</Label>
          <Input value={party.pincode} onChange={(e) => onChange({ pincode: e.target.value })} placeholder="400001" maxLength={6} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">GSTIN</Label>
          <Input value={party.gstin || ''} onChange={(e) => onChange({ gstin: e.target.value.toUpperCase() })} placeholder="GSTIN (optional)" maxLength={15} className="font-mono text-xs" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Phone</Label>
          <Input value={party.phone || ''} onChange={(e) => onChange({ phone: e.target.value })} placeholder="+91 98765 43210" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Email</Label>
          <Input type="email" value={party.email || ''} onChange={(e) => onChange({ email: e.target.value })} placeholder="contact@company.com" />
        </div>
      </div>
    </div>
  );
}

export function PartyInfoBlock({ block }: Props) {
  const { updateBlock } = useBillStore();
  const d = block.data;

  const update = useCallback((patch: Partial<PartyInfoData>) => {
    updateBlock(block.id, { ...d, ...patch });
  }, [block.id, d, updateBlock]);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <PartyForm
        label="Seller (From)"
        party={d.seller}
        onChange={(p) => update({ seller: { ...d.seller, ...p } })}
      />
      <div className="border-l hidden lg:block" />
      <PartyForm
        label="Buyer (To)"
        party={d.buyer}
        onChange={(p) => update({ buyer: { ...d.buyer, ...p } })}
      />
    </div>
  );
}
