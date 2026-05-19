import type { Bill } from '@/types/bill';
import { saveAs } from 'file-saver';

export async function exportToExcel(bill: Bill): Promise<void> {
  const ExcelJSModule = await import('exceljs');
  const ExcelJS = ExcelJSModule.default || ExcelJSModule;
  const wb = new (ExcelJS as typeof import('exceljs')).Workbook();

  const companyBlock = bill.blocks.find((b) => b.type === 'company_header');
  const partyBlock = bill.blocks.find((b) => b.type === 'party_info');
  const orderBlock = bill.blocks.find((b) => b.type === 'order_info');
  const itemsBlock = bill.blocks.find((b) => b.type === 'items_table');
  const taxBlock = bill.blocks.find((b) => b.type === 'tax_summary');
  const bankBlock = bill.blocks.find((b) => b.type === 'bank_details');

  const companyName = companyBlock?.type === 'company_header' ? companyBlock.data.companyName : 'Billar';
  const gstMode = itemsBlock?.type === 'items_table' ? itemsBlock.data.gstMode : 'cgst_sgst';

  // ─── Invoice Sheet ───────────────────────────────────────────────────────────
  const ws = wb.addWorksheet('Invoice');

  ws.columns = [
    { width: 6 }, { width: 30 }, { width: 12 }, { width: 8 }, { width: 8 },
    { width: 12 }, { width: 8 }, { width: 14 }, { width: 12 }, { width: 12 }, { width: 14 },
  ];

  // Title row
  ws.mergeCells('A1:K1');
  const titleRow = ws.getCell('A1');
  titleRow.value = companyName;
  titleRow.font = { bold: true, size: 16 };
  titleRow.alignment = { horizontal: 'center' };

  ws.mergeCells('A2:K2');
  ws.getCell('A2').value = bill.meta.billType.toUpperCase().replace('_', ' ');
  ws.getCell('A2').font = { bold: true, size: 12 };
  ws.getCell('A2').alignment = { horizontal: 'center' };

  let row = 4;

  // Party info
  if (partyBlock?.type === 'party_info') {
    const s = partyBlock.data.seller;
    const b = partyBlock.data.buyer;
    ws.getCell(`A${row}`).value = 'From:'; ws.getCell(`A${row}`).font = { bold: true };
    ws.getCell(`F${row}`).value = 'To:'; ws.getCell(`F${row}`).font = { bold: true };
    row++;
    ws.getCell(`A${row}`).value = s.name; ws.getCell(`F${row}`).value = b.name;
    row++;
    ws.getCell(`A${row}`).value = s.address; ws.getCell(`F${row}`).value = b.address;
    row++;
    ws.getCell(`A${row}`).value = `${s.city}, ${s.state}`; ws.getCell(`F${row}`).value = `${b.city}, ${b.state}`;
    row++;
    ws.getCell(`A${row}`).value = `GSTIN: ${s.gstin || '-'}`; ws.getCell(`F${row}`).value = `GSTIN: ${b.gstin || '-'}`;
    row += 2;
  }

  if (orderBlock?.type === 'order_info') {
    const o = orderBlock.data;
    ws.getCell(`A${row}`).value = `Bill No: ${o.billNumber || '-'}`;
    ws.getCell(`D${row}`).value = `Date: ${o.billDate || '-'}`;
    ws.getCell(`G${row}`).value = `PO No: ${o.poNumber || '-'}`;
    row++;
    ws.getCell(`A${row}`).value = `Place of Supply: ${o.placeOfSupply || '-'}`;
    row += 2;
  }

  // Items table header
  const headers = ['#', 'Description', 'HSN Code', 'Qty', 'Unit', 'Rate (₹)', 'Disc%', 'Taxable (₹)',
    gstMode === 'cgst_sgst' ? 'CGST (₹)' : 'IGST (₹)',
    gstMode === 'cgst_sgst' ? 'SGST (₹)' : 'Cess (₹)',
    'Total (₹)',
  ];

  const headerRow = ws.getRow(row);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { horizontal: 'center' };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });
  row++;

  // Items
  if (itemsBlock?.type === 'items_table') {
    itemsBlock.data.items.forEach((item, idx) => {
      const dataRow = ws.getRow(row);
      const values = [
        item.slNo, item.description, item.hsnCode, item.quantity, item.unit,
        item.unitPrice, item.discount, item.taxableValue,
        gstMode === 'cgst_sgst' ? (item.cgstAmount || 0) : (item.igstAmount || 0),
        gstMode === 'cgst_sgst' ? (item.sgstAmount || 0) : (item.cessAmount || 0),
        item.totalAmount,
      ];
      values.forEach((v, i) => {
        const cell = dataRow.getCell(i + 1);
        cell.value = v as import('exceljs').CellValue;
        if (typeof v === 'number' && i >= 5) cell.numFmt = '₹#,##0.00';
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF' } };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });
      row++;
    });

    // Totals
    row++;
    const totals: Array<[string, number | undefined]> = [
      ['Subtotal', itemsBlock.data.subtotal],
      ['Discount', itemsBlock.data.totalDiscount > 0 ? itemsBlock.data.totalDiscount : undefined],
      ['Taxable Amount', itemsBlock.data.totalTaxableValue],
      ['CGST', itemsBlock.data.totalCgst],
      ['SGST', itemsBlock.data.totalSgst],
      ['IGST', itemsBlock.data.totalIgst],
      ['Cess', itemsBlock.data.totalCess],
      ['Round Off', itemsBlock.data.roundOff !== 0 ? itemsBlock.data.roundOff : undefined],
      ['Grand Total', itemsBlock.data.grandTotal],
    ];

    for (const [label, val] of totals) {
      if (val === undefined) continue;
      const r = ws.getRow(row);
      r.getCell(9).value = label;
      r.getCell(9).font = { bold: label === 'Grand Total' };
      r.getCell(11).value = val;
      r.getCell(11).numFmt = '₹#,##0.00';
      r.getCell(11).font = { bold: label === 'Grand Total' };
      row++;
    }

    row++;
    ws.getCell(`A${row}`).value = `Amount in Words: ${itemsBlock.data.amountInWords}`;
    ws.getCell(`A${row}`).font = { italic: true };
    row += 2;
  }

  // Bank details
  if (bankBlock?.type === 'bank_details') {
    const b = bankBlock.data;
    ws.getCell(`A${row}`).value = 'Bank Details'; ws.getCell(`A${row}`).font = { bold: true };
    row++;
    ws.getCell(`A${row}`).value = `Bank: ${b.bankName}`;
    ws.getCell(`D${row}`).value = `A/C No: ${b.accountNumber}`;
    ws.getCell(`G${row}`).value = `IFSC: ${b.ifscCode}`;
    row++;
    ws.getCell(`A${row}`).value = `Branch: ${b.branchName}`;
    if (b.upiId) ws.getCell(`D${row}`).value = `UPI: ${b.upiId}`;
    row += 2;
  }

  // Tax Summary Sheet
  if (taxBlock?.type === 'tax_summary' && taxBlock.data.taxLines.length > 0) {
    const taxWs = wb.addWorksheet('GST Summary');
    const taxHeaders = ['HSN Code', 'Description', 'Taxable Value', 'CGST Rate', 'CGST Amt', 'SGST Rate', 'SGST Amt', 'IGST Rate', 'IGST Amt', 'Total Tax'];
    const taxHeaderRow = taxWs.getRow(1);
    taxHeaders.forEach((h, i) => {
      const cell = taxHeaderRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    });
    taxBlock.data.taxLines.forEach((tl, idx) => {
      const r = taxWs.getRow(idx + 2);
      const vals = [tl.hsnCode, tl.description, tl.taxableValue, tl.breakdown.cgstRate || 0, tl.breakdown.cgstAmount || 0,
        tl.breakdown.sgstRate || 0, tl.breakdown.sgstAmount || 0, tl.breakdown.igstRate || 0, tl.breakdown.igstAmount || 0, tl.breakdown.totalTax];
      vals.forEach((v, i) => { r.getCell(i + 1).value = v as import('exceljs').CellValue; });
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const fileName = `${bill.meta.billNumber || 'bill'}_${bill.meta.id}.xlsx`.replace(/[/\\]/g, '-');
  saveAs(blob, fileName);
}
