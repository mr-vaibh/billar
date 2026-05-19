'use client';
import { useCallback } from 'react';
import { useBillStore } from '@/store/billStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Block, CompanyHeaderData } from '@/types/bill';

interface Props { block: Block & { type: 'company_header' } }

export function CompanyHeaderBlock({ block }: Props) {
  const { updateBlock } = useBillStore();
  const d = block.data;

  const update = useCallback((patch: Partial<CompanyHeaderData>) => {
    updateBlock(block.id, { ...d, ...patch });
  }, [block.id, d, updateBlock]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Company Name *</Label>
          <Input value={d.companyName} onChange={(e) => update({ companyName: e.target.value })} placeholder="Your Company Pvt. Ltd." />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Tagline</Label>
          <Input value={d.tagline || ''} onChange={(e) => update({ tagline: e.target.value })} placeholder="Your trusted partner" />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Address *</Label>
        <Input value={d.address} onChange={(e) => update({ address: e.target.value })} placeholder="123, Main Street, Area" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">City *</Label>
          <Input value={d.city} onChange={(e) => update({ city: e.target.value })} placeholder="Mumbai" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">State *</Label>
          <Input value={d.state} onChange={(e) => update({ state: e.target.value })} placeholder="Maharashtra" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">PIN Code *</Label>
          <Input value={d.pincode} onChange={(e) => update({ pincode: e.target.value })} placeholder="400001" maxLength={6} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Phone *</Label>
          <Input value={d.phone} onChange={(e) => update({ phone: e.target.value })} placeholder="+91 98765 43210" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Email *</Label>
          <Input type="email" value={d.email} onChange={(e) => update({ email: e.target.value })} placeholder="info@company.com" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">GSTIN *</Label>
          <Input value={d.gstin} onChange={(e) => update({ gstin: e.target.value.toUpperCase() })} placeholder="22AAAAA0000A1Z5" maxLength={15} className="font-mono text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">PAN *</Label>
          <Input value={d.pan} onChange={(e) => update({ pan: e.target.value.toUpperCase() })} placeholder="AAAAA0000A" maxLength={10} className="font-mono text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">CIN (optional)</Label>
          <Input value={d.cin || ''} onChange={(e) => update({ cin: e.target.value.toUpperCase() })} placeholder="U12345MH2000PTC000000" className="font-mono text-xs" />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Website (optional)</Label>
        <Input value={d.website || ''} onChange={(e) => update({ website: e.target.value })} placeholder="https://www.yourcompany.com" />
      </div>
    </div>
  );
}
