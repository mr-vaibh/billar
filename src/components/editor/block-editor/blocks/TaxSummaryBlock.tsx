'use client';
import { useBillStore } from '@/store/billStore';
import type { Block } from '@/types/bill';

interface Props { block: Block & { type: 'tax_summary' } }

export function TaxSummaryBlock({ block }: Props) {
  const d = block.data;
  const { currentBill } = useBillStore();
  const itemsBlock = currentBill?.blocks.find((b) => b.type === 'items_table');
  const gstMode = itemsBlock?.type === 'items_table' ? itemsBlock.data.gstMode : 'cgst_sgst';

  if (!d.taxLines.length) {
    return (
      <div className="text-sm text-muted-foreground italic text-center py-4">
        Tax summary is auto-calculated from the Items block. Add items with HSN codes to see the breakdown.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Auto-calculated from Items block. Read-only.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="px-3 py-2 text-left">HSN Code</th>
              <th className="px-3 py-2 text-right">Taxable Value</th>
              {gstMode === 'cgst_sgst' ? (
                <>
                  <th className="px-3 py-2 text-right">CGST Rate</th>
                  <th className="px-3 py-2 text-right">CGST Amt</th>
                  <th className="px-3 py-2 text-right">SGST Rate</th>
                  <th className="px-3 py-2 text-right">SGST Amt</th>
                </>
              ) : (
                <>
                  <th className="px-3 py-2 text-right">IGST Rate</th>
                  <th className="px-3 py-2 text-right">IGST Amt</th>
                </>
              )}
              <th className="px-3 py-2 text-right">Total Tax</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {d.taxLines.map((tl, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                <td className="px-3 py-2 font-mono">{tl.hsnCode || '-'}</td>
                <td className="px-3 py-2 text-right font-mono">₹{tl.taxableValue.toFixed(2)}</td>
                {gstMode === 'cgst_sgst' ? (
                  <>
                    <td className="px-3 py-2 text-right">{tl.breakdown.cgstRate}%</td>
                    <td className="px-3 py-2 text-right font-mono">₹{(tl.breakdown.cgstAmount || 0).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{tl.breakdown.sgstRate}%</td>
                    <td className="px-3 py-2 text-right font-mono">₹{(tl.breakdown.sgstAmount || 0).toFixed(2)}</td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-2 text-right">{tl.breakdown.igstRate}%</td>
                    <td className="px-3 py-2 text-right font-mono">₹{(tl.breakdown.igstAmount || 0).toFixed(2)}</td>
                  </>
                )}
                <td className="px-3 py-2 text-right font-mono font-semibold">₹{tl.breakdown.totalTax.toFixed(2)}</td>
              </tr>
            ))}
            {/* Totals row */}
            <tr className="border-t-2 font-bold bg-slate-100">
              <td className="px-3 py-2">Total</td>
              <td className="px-3 py-2 text-right font-mono">₹{d.totalTaxableValue.toFixed(2)}</td>
              {gstMode === 'cgst_sgst' ? (
                <>
                  <td />
                  <td className="px-3 py-2 text-right font-mono">₹{(d.totalCgst || 0).toFixed(2)}</td>
                  <td />
                  <td className="px-3 py-2 text-right font-mono">₹{(d.totalSgst || 0).toFixed(2)}</td>
                </>
              ) : (
                <>
                  <td />
                  <td className="px-3 py-2 text-right font-mono">₹{(d.totalIgst || 0).toFixed(2)}</td>
                </>
              )}
              <td className="px-3 py-2 text-right font-mono">₹{d.totalTax.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
