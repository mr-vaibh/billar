'use client';
import { useCallback, useEffect } from 'react';
import { useBillStore } from '@/store/billStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Block, OrderInfoData } from '@/types/bill';
import { INDIAN_STATES } from '@/features/bills/billUtils';

interface Props { block: Block & { type: 'order_info' } }

export function OrderInfoBlock({ block }: Props) {
  const { updateBlock, updateBillMeta, currentBill } = useBillStore();
  const d = block.data;

  const update = useCallback((patch: Partial<OrderInfoData>) => {
    updateBlock(block.id, { ...d, ...patch });
    // Sync bill number to meta
    if (patch.billNumber !== undefined) {
      updateBillMeta({ billNumber: patch.billNumber });
    }
  }, [block.id, d, updateBlock, updateBillMeta]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Bill / Invoice Number *</Label>
          <Input
            value={d.billNumber}
            onChange={(e) => update({ billNumber: e.target.value })}
            placeholder="INV/2526/0001"
            className="font-mono"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Bill Date *</Label>
          <Input type="date" value={d.billDate} onChange={(e) => update({ billDate: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Due Date</Label>
          <Input type="date" value={d.dueDate || ''} onChange={(e) => update({ dueDate: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">PO Number</Label>
          <Input value={d.poNumber || ''} onChange={(e) => update({ poNumber: e.target.value })} placeholder="PO-2526-001" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Delivery Date</Label>
          <Input type="date" value={d.deliveryDate || ''} onChange={(e) => update({ deliveryDate: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Place of Supply *</Label>
          <Select value={d.placeOfSupply} onValueChange={(v) => v && update({ placeOfSupply: v })}>
            <SelectTrigger className="text-xs h-9">
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {INDIAN_STATES.map((s) => <SelectItem key={s.code} value={s.code} className="text-xs">{s.code} - {s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">E-Way Bill No.</Label>
          <Input value={d.eWayBillNumber || ''} onChange={(e) => update({ eWayBillNumber: e.target.value })} placeholder="123456789012" maxLength={12} className="font-mono text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Vehicle Number</Label>
          <Input value={d.vehicleNumber || ''} onChange={(e) => update({ vehicleNumber: e.target.value.toUpperCase() })} placeholder="MH12AB1234" className="font-mono text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Transporter</Label>
          <Input value={d.transporterName || ''} onChange={(e) => update({ transporterName: e.target.value })} placeholder="Transporter name" />
        </div>
      </div>

      <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
        <Switch id="rc" checked={d.reverseCharge} onCheckedChange={(v) => update({ reverseCharge: v })} />
        <Label htmlFor="rc" className="text-sm cursor-pointer">
          Reverse Charge Applicable
          <span className="block text-xs text-muted-foreground font-normal">GST to be paid by recipient under reverse charge mechanism</span>
        </Label>
      </div>
    </div>
  );
}
