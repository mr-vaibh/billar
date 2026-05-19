'use client';
import { useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useBillStore } from '@/store/billStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { Block, LineItem, ItemsTableData } from '@/types/bill';
import type { GstMode } from '@/types/gst';
import { generateId } from '@/lib/idGenerator';
import { computeLineItem } from '@/features/gst/gstCalculator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

const GST_RATES = [0, 5, 12, 18, 28];
const UNITS = ['Nos', 'Pcs', 'Kg', 'Gm', 'Ltr', 'Mtr', 'Sqft', 'Set', 'Box', 'Pair', 'Doz', 'Hrs', 'Days'];

interface Props { block: Block & { type: 'items_table' } }

function newItem(gstMode: GstMode, slNo: number): LineItem {
  return computeLineItem({
    id: generateId(), slNo, description: '', hsnCode: '', quantity: 1, unit: 'Nos',
    unitPrice: 0, discount: 0, gstRate: 18, cessRate: 0,
  }, gstMode);
}

export function ItemsTableBlock({ block }: Props) {
  const { updateItemsTable, updateBlock } = useBillStore();
  const d = block.data;

  const updateItems = useCallback((items: LineItem[]) => {
    updateItemsTable(items);
  }, [updateItemsTable]);

  function addItem() {
    const items = [...d.items, newItem(d.gstMode, d.items.length + 1)];
    updateItems(items);
  }

  function removeItem(id: string) {
    const items = d.items.filter((i) => i.id !== id).map((i, idx) => ({ ...i, slNo: idx + 1 }));
    updateItems(items);
  }

  function updateItem(id: string, patch: Partial<LineItem>) {
    const items = d.items.map((item) => {
      if (item.id !== id) return item;
      const merged = { ...item, ...patch };
      return computeLineItem(merged, d.gstMode);
    });
    updateItems(items);
  }

  function toggleGstMode() {
    const newMode: GstMode = d.gstMode === 'cgst_sgst' ? 'igst' : 'cgst_sgst';
    const items = d.items.map((item) => computeLineItem(item, newMode));
    updateBlock(block.id, { ...d, gstMode: newMode, items });
    updateItems(items);
  }

  return (
    <div className="space-y-4">
      {/* GST Mode toggle */}
      <div className="flex items-center gap-4 p-3 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-2">
          <Switch id="gstmode" checked={d.gstMode === 'igst'} onCheckedChange={toggleGstMode} />
          <Label htmlFor="gstmode" className="text-sm cursor-pointer">
            {d.gstMode === 'cgst_sgst' ? 'Intra-state (CGST + SGST)' : 'Inter-state (IGST)'}
          </Label>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {d.gstMode === 'cgst_sgst' ? (
            <><Badge variant="secondary">CGST</Badge><Badge variant="secondary">SGST</Badge></>
          ) : (
            <Badge variant="secondary">IGST</Badge>
          )}
        </div>
      </div>

      {/* Items table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white">
              {['#', 'Description', 'HSN', 'Qty', 'Unit', 'Rate (₹)', 'Disc%',
                d.gstMode === 'cgst_sgst' ? 'CGST%' : 'IGST%',
                d.gstMode === 'cgst_sgst' ? 'SGST%' : 'IGST ₹',
                'Total (₹)', ''].map((h, i) => (
                <th key={i} className="px-2 py-2 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {d.items.map((item, idx) => (
              <tr key={item.id} className={idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                <td className="px-2 py-1.5 text-center text-muted-foreground">{item.slNo}</td>
                <td className="px-1 py-1">
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(item.id, { description: e.target.value })}
                    placeholder="Item description"
                    className="h-7 text-xs border-0 bg-transparent focus-visible:ring-1"
                  />
                </td>
                <td className="px-1 py-1">
                  <Input
                    value={item.hsnCode}
                    onChange={(e) => updateItem(item.id, { hsnCode: e.target.value })}
                    placeholder="HSN"
                    className="h-7 text-xs w-20 font-mono border-0 bg-transparent focus-visible:ring-1"
                    maxLength={8}
                  />
                </td>
                <td className="px-1 py-1">
                  <Input
                    type="number" min="0" step="0.01"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                    className="h-7 text-xs w-16 border-0 bg-transparent focus-visible:ring-1"
                  />
                </td>
                <td className="px-1 py-1">
                  <Select value={item.unit} onValueChange={(v) => updateItem(item.id, { unit: v ?? 'Nos' })}>
                    <SelectTrigger className="h-7 text-xs w-16 border-0 bg-transparent">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-1 py-1">
                  <Input
                    type="number" min="0" step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                    className="h-7 text-xs w-24 border-0 bg-transparent focus-visible:ring-1"
                  />
                </td>
                <td className="px-1 py-1">
                  <Input
                    type="number" min="0" max="100" step="0.1"
                    value={item.discount}
                    onChange={(e) => updateItem(item.id, { discount: parseFloat(e.target.value) || 0 })}
                    className="h-7 text-xs w-14 border-0 bg-transparent focus-visible:ring-1"
                  />
                </td>
                <td className="px-1 py-1">
                  <Select value={String(item.gstRate)} onValueChange={(v) => updateItem(item.id, { gstRate: parseInt(v ?? '18') })}>
                    <SelectTrigger className="h-7 text-xs w-16 border-0 bg-transparent">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GST_RATES.map((r) => <SelectItem key={r} value={String(r)} className="text-xs">{r}%</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-2 py-1.5 text-right font-mono">
                  {d.gstMode === 'cgst_sgst'
                    ? `₹${(item.cgstAmount || 0).toFixed(2)}`
                    : `₹${(item.igstAmount || 0).toFixed(2)}`}
                </td>
                <td className="px-2 py-1.5 text-right font-mono font-semibold">
                  ₹{item.totalAmount.toFixed(2)}
                </td>
                <td className="px-1 py-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => removeItem(item.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button variant="outline" size="sm" className="gap-1.5" onClick={addItem}>
        <Plus className="h-3.5 w-3.5" />
        Add Item
      </Button>

      {/* Totals */}
      {d.items.length > 0 && (
        <div className="mt-4 border-t pt-4">
          <div className="flex justify-end">
            <div className="w-72 space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono">₹{d.subtotal.toFixed(2)}</span>
              </div>
              {d.totalDiscount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span className="font-mono text-red-600">-₹{d.totalDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Taxable Amount</span>
                <span className="font-mono">₹{d.totalTaxableValue.toFixed(2)}</span>
              </div>
              {d.totalCgst != null && d.totalCgst > 0 && (
                <>
                  <div className="flex justify-between text-muted-foreground">
                    <span>CGST</span>
                    <span className="font-mono">₹{d.totalCgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>SGST</span>
                    <span className="font-mono">₹{(d.totalSgst || 0).toFixed(2)}</span>
                  </div>
                </>
              )}
              {d.totalIgst != null && d.totalIgst > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>IGST</span>
                  <span className="font-mono">₹{d.totalIgst.toFixed(2)}</span>
                </div>
              )}
              {d.totalCess != null && d.totalCess > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Cess</span>
                  <span className="font-mono">₹{d.totalCess.toFixed(2)}</span>
                </div>
              )}
              {d.roundOff !== 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Round Off</span>
                  <span className="font-mono">{d.roundOff > 0 ? '+' : ''}₹{d.roundOff.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
                <span>Grand Total</span>
                <span className="font-mono">₹{d.grandTotal.toFixed(2)}</span>
              </div>
              {d.amountInWords && (
                <p className="text-xs text-muted-foreground italic mt-1">{d.amountInWords}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
