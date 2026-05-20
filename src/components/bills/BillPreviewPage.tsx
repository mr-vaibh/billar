'use client';
import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ChevronLeft, Download, Pencil, Loader2, Printer, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { PaymentPanel } from '@/components/bills/PaymentPanel';
import { SendInvoiceDialog } from '@/components/bills/SendInvoiceDialog';
import type { Bill } from '@/types/bill';
import { exportToPdf } from '@/features/export/exportPdf';
import { exportToExcel } from '@/features/export/exportExcel';
import { exportToWord } from '@/features/export/exportWord';
import { BILL_TYPE_LABELS } from '@/features/bills/billUtils';

interface Payment {
  id: string; amount: number; paidAt: string; mode: string;
  reference: string | null; notes: string | null;
}

interface Props {
  bill: Bill;
  orgId?: string;
  payments?: Payment[];
  canEdit?: boolean;
}

export function BillPreviewPage({ bill, orgId, payments = [], canEdit = false }: Props) {
  const [isExporting, setIsExporting] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

  const companyBlock = bill.blocks.find((b) => b.type === 'company_header');
  const partyBlock = bill.blocks.find((b) => b.type === 'party_info');
  const orderBlock = bill.blocks.find((b) => b.type === 'order_info');
  const itemsBlock = bill.blocks.find((b) => b.type === 'items_table');
  const taxBlock = bill.blocks.find((b) => b.type === 'tax_summary');
  const bankBlock = bill.blocks.find((b) => b.type === 'bank_details');
  const termsBlock = bill.blocks.find((b) => b.type === 'terms');
  const signBlock = bill.blocks.find((b) => b.type === 'signature');

  const company = companyBlock?.type === 'company_header' ? companyBlock.data : null;
  const party = partyBlock?.type === 'party_info' ? partyBlock.data : null;
  const order = orderBlock?.type === 'order_info' ? orderBlock.data : null;
  const items = itemsBlock?.type === 'items_table' ? itemsBlock.data : null;
  const tax = taxBlock?.type === 'tax_summary' ? taxBlock.data : null;
  const bank = bankBlock?.type === 'bank_details' ? bankBlock.data : null;
  const terms = termsBlock?.type === 'terms' ? termsBlock.data : null;
  const sign = signBlock?.type === 'signature' ? signBlock.data : null;

  const editHref = orgId ? `/orgs/${orgId}/bills/${bill.meta.id}` : null;

  async function handleExport(format: 'pdf' | 'word' | 'excel') {
    setIsExporting(true);
    try {
      if (format === 'pdf') await exportToPdf(bill);
      else if (format === 'excel') await exportToExcel(bill);
      else await exportToWord(bill);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  }

  const grandTotal = bill.meta.grandTotal ?? items?.grandTotal ?? 0;

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Action bar (hidden in print) */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b px-4 py-2 flex items-center gap-2">
        {editHref && (
          <Link href={editHref}>
            <Button variant="ghost" size="icon" className="h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button>
          </Link>
        )}
        <span className="font-medium text-sm flex-1">{bill.meta.billNumber || 'Preview'}</span>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5" />Print
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/80 disabled:opacity-50" disabled={isExporting}>
            {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Export
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleExport('pdf')}>PDF</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('word')}>Word (.docx)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('excel')}>Excel (.xlsx)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {orgId && (
          <Button size="sm" className="gap-1.5" onClick={() => setSendOpen(true)}>
            <Send className="h-3.5 w-3.5" />Send
          </Button>
        )}
        {editHref && (
          <Link href={editHref}>
            <Button variant="outline" size="sm" className="gap-1.5"><Pencil className="h-3.5 w-3.5" />Edit</Button>
          </Link>
        )}
      </div>

      {/* A4 Preview */}
      <div className="max-w-4xl mx-auto p-4 print:p-0 print:max-w-none">
        <div className="bg-white shadow-lg print:shadow-none p-10 print:p-8 min-h-[297mm] font-[Arial,sans-serif]" id="bill-preview">

          {/* Company Header */}
          {company && (
            <div className="text-center border-b-2 border-slate-800 pb-4 mb-4">
              {company.logo && <img src={company.logo} alt="Logo" className="h-14 mx-auto mb-2 object-contain" />}
              <h1 className="text-2xl font-bold text-slate-800">{company.companyName}</h1>
              {company.tagline && <p className="text-sm text-slate-500">{company.tagline}</p>}
              <p className="text-sm text-slate-600 mt-1">{company.address}, {company.city}, {company.state} - {company.pincode}</p>
              <p className="text-sm text-slate-600">Tel: {company.phone} | Email: {company.email}</p>
              <div className="flex justify-center gap-4 text-xs text-slate-500 mt-1">
                <span>GSTIN: <strong>{company.gstin || '-'}</strong></span>
                <span>PAN: <strong>{company.pan || '-'}</strong></span>
                {company.cin && <span>CIN: <strong>{company.cin}</strong></span>}
              </div>
            </div>
          )}

          {/* Bill Type Title */}
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold border border-slate-800 inline-block px-6 py-1">
              {BILL_TYPE_LABELS[bill.meta.billType] || 'TAX INVOICE'}
            </h2>
          </div>

          {/* Party Info + Order Info */}
          <div className="grid grid-cols-2 gap-6 mb-4 text-sm">
            {party && (
              <>
                <div>
                  <p className="font-semibold text-slate-700 mb-1">Bill From:</p>
                  <p className="font-medium">{party.seller.name}</p>
                  <p className="text-slate-600">{party.seller.address}</p>
                  <p className="text-slate-600">{party.seller.city}, {party.seller.state} {party.seller.pincode}</p>
                  {party.seller.gstin && <p className="text-slate-600">GSTIN: <strong>{party.seller.gstin}</strong></p>}
                  {party.seller.phone && <p className="text-slate-600">Tel: {party.seller.phone}</p>}
                </div>
                <div>
                  <p className="font-semibold text-slate-700 mb-1">Bill To:</p>
                  <p className="font-medium">{party.buyer.name}</p>
                  <p className="text-slate-600">{party.buyer.address}</p>
                  <p className="text-slate-600">{party.buyer.city}, {party.buyer.state} {party.buyer.pincode}</p>
                  {party.buyer.gstin && <p className="text-slate-600">GSTIN: <strong>{party.buyer.gstin}</strong></p>}
                  {party.buyer.phone && <p className="text-slate-600">Tel: {party.buyer.phone}</p>}
                </div>
              </>
            )}
          </div>

          {order && (
            <div className="border rounded p-3 mb-4 bg-slate-50 grid grid-cols-3 gap-3 text-sm">
              <div><span className="text-slate-500">Bill No:</span> <strong>{order.billNumber || '-'}</strong></div>
              <div><span className="text-slate-500">Date:</span> <strong>{order.billDate}</strong></div>
              {order.dueDate && <div><span className="text-slate-500">Due Date:</span> <strong>{order.dueDate}</strong></div>}
              {order.poNumber && <div><span className="text-slate-500">PO No:</span> <strong>{order.poNumber}</strong></div>}
              <div><span className="text-slate-500">Place of Supply:</span> <strong>{order.placeOfSupply}</strong></div>
              <div><span className="text-slate-500">Reverse Charge:</span> <strong>{order.reverseCharge ? 'Yes' : 'No'}</strong></div>
              {order.eWayBillNumber && <div><span className="text-slate-500">E-Way Bill:</span> <strong>{order.eWayBillNumber}</strong></div>}
            </div>
          )}

          {/* Items Table */}
          {items && items.items.length > 0 && (
            <div className="mb-4">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="border px-2 py-1.5 text-center">#</th>
                    <th className="border px-2 py-1.5 text-left">Description</th>
                    <th className="border px-2 py-1.5 text-center">HSN</th>
                    <th className="border px-2 py-1.5 text-right">Qty</th>
                    <th className="border px-2 py-1.5 text-center">Unit</th>
                    <th className="border px-2 py-1.5 text-right">Rate</th>
                    <th className="border px-2 py-1.5 text-right">Disc%</th>
                    <th className="border px-2 py-1.5 text-right">Taxable</th>
                    {items.gstMode === 'cgst_sgst' ? (
                      <>
                        <th className="border px-2 py-1.5 text-right">CGST</th>
                        <th className="border px-2 py-1.5 text-right">SGST</th>
                      </>
                    ) : (
                      <th className="border px-2 py-1.5 text-right">IGST</th>
                    )}
                    <th className="border px-2 py-1.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.items.map((item, idx) => (
                    <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="border px-2 py-1 text-center">{item.slNo}</td>
                      <td className="border px-2 py-1">{item.description}</td>
                      <td className="border px-2 py-1 text-center font-mono">{item.hsnCode}</td>
                      <td className="border px-2 py-1 text-right">{item.quantity}</td>
                      <td className="border px-2 py-1 text-center">{item.unit}</td>
                      <td className="border px-2 py-1 text-right">₹{item.unitPrice.toFixed(2)}</td>
                      <td className="border px-2 py-1 text-right">{item.discount}%</td>
                      <td className="border px-2 py-1 text-right">₹{item.taxableValue.toFixed(2)}</td>
                      {items.gstMode === 'cgst_sgst' ? (
                        <>
                          <td className="border px-2 py-1 text-right">₹{(item.cgstAmount || 0).toFixed(2)}</td>
                          <td className="border px-2 py-1 text-right">₹{(item.sgstAmount || 0).toFixed(2)}</td>
                        </>
                      ) : (
                        <td className="border px-2 py-1 text-right">₹{(item.igstAmount || 0).toFixed(2)}</td>
                      )}
                      <td className="border px-2 py-1 text-right font-semibold">₹{item.totalAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end mt-2">
                <div className="w-64 text-sm space-y-1">
                  {[
                    ['Subtotal', `₹${items.subtotal.toFixed(2)}`],
                    items.totalDiscount > 0 ? ['Discount', `-₹${items.totalDiscount.toFixed(2)}`] : null,
                    ['Taxable Amount', `₹${items.totalTaxableValue.toFixed(2)}`],
                    items.totalCgst ? ['CGST', `₹${items.totalCgst.toFixed(2)}`] : null,
                    items.totalSgst ? ['SGST', `₹${items.totalSgst.toFixed(2)}`] : null,
                    items.totalIgst ? ['IGST', `₹${items.totalIgst.toFixed(2)}`] : null,
                    items.totalCess ? ['Cess', `₹${items.totalCess.toFixed(2)}`] : null,
                    items.roundOff !== 0 ? ['Round Off', `₹${items.roundOff.toFixed(2)}`] : null,
                  ].filter(Boolean).map((row) => {
                    const [label, val] = row as [string, string];
                    return (
                      <div key={label} className="flex justify-between text-slate-600 text-xs">
                        <span>{label}</span>
                        <span className="font-mono">{val}</span>
                      </div>
                    );
                  })}
                  <div className="flex justify-between font-bold text-slate-800 border-t pt-1">
                    <span>Grand Total</span>
                    <span className="font-mono">₹{items.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              {items.amountInWords && (
                <p className="text-xs italic text-slate-500 mt-2">
                  Amount in Words: <strong>{items.amountInWords}</strong>
                </p>
              )}
            </div>
          )}

          {/* Tax Summary */}
          {tax && tax.taxLines.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-2 text-slate-700">GST Tax Summary</h3>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-200">
                    <th className="border px-2 py-1 text-left">HSN Code</th>
                    <th className="border px-2 py-1 text-right">Taxable Value</th>
                    <th className="border px-2 py-1 text-right">CGST</th>
                    <th className="border px-2 py-1 text-right">SGST</th>
                    <th className="border px-2 py-1 text-right">IGST</th>
                    <th className="border px-2 py-1 text-right">Total Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {tax.taxLines.map((tl, idx) => (
                    <tr key={idx}>
                      <td className="border px-2 py-1 font-mono">{tl.hsnCode}</td>
                      <td className="border px-2 py-1 text-right">₹{tl.taxableValue.toFixed(2)}</td>
                      <td className="border px-2 py-1 text-right">₹{(tl.breakdown.cgstAmount || 0).toFixed(2)}</td>
                      <td className="border px-2 py-1 text-right">₹{(tl.breakdown.sgstAmount || 0).toFixed(2)}</td>
                      <td className="border px-2 py-1 text-right">₹{(tl.breakdown.igstAmount || 0).toFixed(2)}</td>
                      <td className="border px-2 py-1 text-right font-semibold">₹{tl.breakdown.totalTax.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Bank + Terms + Signature */}
          <div className="grid grid-cols-2 gap-6 mt-4 text-sm">
            {bank && (
              <div className="border rounded p-3">
                <p className="font-semibold text-slate-700 mb-2">Bank Details</p>
                <p><span className="text-slate-500">Bank:</span> {bank.bankName}</p>
                <p><span className="text-slate-500">A/C No:</span> <strong className="font-mono">{bank.accountNumber}</strong></p>
                <p><span className="text-slate-500">IFSC:</span> <strong className="font-mono">{bank.ifscCode}</strong></p>
                <p><span className="text-slate-500">Branch:</span> {bank.branchName}</p>
                {bank.upiId && <p><span className="text-slate-500">UPI:</span> {bank.upiId}</p>}
              </div>
            )}

            {sign && (
              <div className="border rounded p-3 text-right">
                {sign.companyStamp && <img src={sign.companyStamp} alt="Stamp" className="h-12 mb-2 object-contain inline-block" />}
                {sign.signatureImage && <img src={sign.signatureImage} alt="Signature" className="h-10 object-contain inline-block" />}
                <div className="border-t mt-3 pt-2">
                  <p className="font-semibold">{sign.signatoryName}</p>
                  {sign.designation && <p className="text-slate-500 text-xs">{sign.designation}</p>}
                </div>
              </div>
            )}
          </div>

          {terms && (
            <div className="mt-4 pt-4 border-t text-xs text-slate-500">
              <p className="font-semibold text-slate-700 mb-1">Terms & Conditions</p>
              <p className="whitespace-pre-line">{terms.terms}</p>
              {terms.declaration && <p className="italic mt-2">{terms.declaration}</p>}
            </div>
          )}

          <div className="mt-6 pt-4 border-t text-center text-xs text-slate-400">
            Generated by Billar • Computer generated invoice, no signature required.
          </div>
        </div>

        {/* Payment Panel — only shown in org context, hidden from print */}
        {orgId && (
          <div className="print:hidden mt-4 bg-white shadow-lg rounded-lg p-6">
            <PaymentPanel
              orgId={orgId}
              billId={bill.meta.id}
              grandTotal={grandTotal}
              initialPayments={payments}
              canEdit={canEdit}
            />
          </div>
        )}
      </div>

      {orgId && (
        <SendInvoiceDialog
          open={sendOpen}
          onClose={() => setSendOpen(false)}
          orgId={orgId}
          billId={bill.meta.id}
          billNumber={bill.meta.billNumber}
          buyerEmail={party?.buyer.email ?? ''}
        />
      )}
    </div>
  );
}
