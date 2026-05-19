'use client';
import { useCallback } from 'react';
import { useBillStore } from '@/store/billStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Block, SupplierInfoData } from '@/types/bill';

interface Props { block: Block & { type: 'supplier_info' } }

export function SupplierInfoBlock({ block }: Props) {
  const { updateBlock } = useBillStore();
  const d = block.data;

  const update = useCallback((patch: Partial<SupplierInfoData>) => {
    updateBlock(block.id, { ...d, ...patch });
  }, [block.id, d, updateBlock]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Supplier Name *</Label>
          <Input value={d.supplierName} onChange={(e) => update({ supplierName: e.target.value })} placeholder="Supplier company name" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Contact *</Label>
          <Input value={d.contact} onChange={(e) => update({ contact: e.target.value })} placeholder="+91 98765 43210" />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Address</Label>
        <Input value={d.address} onChange={(e) => update({ address: e.target.value })} placeholder="Supplier address" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">GSTIN</Label>
          <Input value={d.gstin || ''} onChange={(e) => update({ gstin: e.target.value.toUpperCase() })} placeholder="GSTIN" maxLength={15} className="font-mono text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Email</Label>
          <Input type="email" value={d.email || ''} onChange={(e) => update({ email: e.target.value })} placeholder="supplier@email.com" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">PO Number</Label>
          <Input value={d.purchaseOrderNumber || ''} onChange={(e) => update({ purchaseOrderNumber: e.target.value })} placeholder="PO-001" />
        </div>
      </div>
    </div>
  );
}
