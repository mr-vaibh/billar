import type { Bill } from '@/types/bill';

export async function exportToPdf(bill: Bill): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 15;

  const companyBlock = bill.blocks.find((b) => b.type === 'company_header');
  const partyBlock = bill.blocks.find((b) => b.type === 'party_info');
  const orderBlock = bill.blocks.find((b) => b.type === 'order_info');
  const itemsBlock = bill.blocks.find((b) => b.type === 'items_table');
  const taxBlock = bill.blocks.find((b) => b.type === 'tax_summary');
  const bankBlock = bill.blocks.find((b) => b.type === 'bank_details');
  const termsBlock = bill.blocks.find((b) => b.type === 'terms');
  const signBlock = bill.blocks.find((b) => b.type === 'signature');

  // ─── Header ─────────────────────────────────────────────────────────────────
  if (companyBlock?.type === 'company_header') {
    const c = companyBlock.data;
    doc.setFontSize(18).setFont('helvetica', 'bold');
    doc.text(c.companyName || 'Company Name', pageW / 2, y, { align: 'center' });
    y += 7;
    doc.setFontSize(9).setFont('helvetica', 'normal');
    doc.text([c.address, `${c.city}, ${c.state} - ${c.pincode}`, `Ph: ${c.phone} | ${c.email}`].filter(Boolean).join('\n'), pageW / 2, y, { align: 'center' });
    y += 12;
    doc.setFontSize(8);
    doc.text(`GSTIN: ${c.gstin || '-'} | PAN: ${c.pan || '-'}`, pageW / 2, y, { align: 'center' });
    y += 8;
  }

  // Bill type title
  const billTypeLabels: Record<string, string> = {
    invoice: 'TAX INVOICE', proforma: 'PROFORMA INVOICE', credit_note: 'CREDIT NOTE',
    debit_note: 'DEBIT NOTE', delivery_challan: 'DELIVERY CHALLAN',
    purchase_order: 'PURCHASE ORDER', quotation: 'QUOTATION',
  };
  doc.setFontSize(12).setFont('helvetica', 'bold');
  doc.text(billTypeLabels[bill.meta.billType] || 'INVOICE', pageW / 2, y, { align: 'center' });
  y += 8;
  doc.setDrawColor(0).line(10, y, pageW - 10, y);
  y += 5;

  // ─── Party + Order Info ───────────────────────────────────────────────────────
  if (partyBlock?.type === 'party_info' || orderBlock?.type === 'order_info') {
    const seller = partyBlock?.type === 'party_info' ? partyBlock.data.seller : null;
    const buyer = partyBlock?.type === 'party_info' ? partyBlock.data.buyer : null;
    const order = orderBlock?.type === 'order_info' ? orderBlock.data : null;

    const leftX = 10, rightX = pageW / 2 + 5;

    doc.setFontSize(9).setFont('helvetica', 'bold');
    doc.text('Bill From:', leftX, y);
    doc.text('Bill To:', rightX, y);
    y += 5;
    doc.setFont('helvetica', 'normal').setFontSize(8);

    const sellerLines = seller ? [seller.name, seller.address, `${seller.city}, ${seller.state}`, `GSTIN: ${seller.gstin || '-'}`] : [];
    const buyerLines = buyer ? [buyer.name, buyer.address, `${buyer.city}, ${buyer.state}`, `GSTIN: ${buyer.gstin || '-'}`] : [];

    const maxLines = Math.max(sellerLines.length, buyerLines.length);
    for (let i = 0; i < maxLines; i++) {
      if (sellerLines[i]) doc.text(sellerLines[i], leftX, y);
      if (buyerLines[i]) doc.text(buyerLines[i], rightX, y);
      y += 4.5;
    }

    if (order) {
      y += 3;
      doc.setFontSize(8);
      const orderInfo = [
        `Bill No: ${order.billNumber || '-'}`,
        `Date: ${order.billDate || '-'}`,
        order.poNumber ? `PO No: ${order.poNumber}` : null,
        order.dueDate ? `Due: ${order.dueDate}` : null,
        `Place of Supply: ${order.placeOfSupply || '-'}`,
      ].filter(Boolean) as string[];

      orderInfo.forEach((line, idx) => {
        doc.text(line, idx % 2 === 0 ? leftX : rightX, y);
        if (idx % 2 === 1) y += 5;
      });
      if (orderInfo.length % 2 !== 0) y += 5;
    }

    y += 5;
    doc.line(10, y, pageW - 10, y);
    y += 5;
  }

  // ─── Items Table ──────────────────────────────────────────────────────────────
  if (itemsBlock?.type === 'items_table') {
    const data = itemsBlock.data;
    const gstMode = data.gstMode;

    const head = [['#', 'Description', 'HSN', 'Qty', 'Unit', 'Rate', 'Disc%', 'Taxable',
      gstMode === 'cgst_sgst' ? 'CGST' : 'IGST',
      gstMode === 'cgst_sgst' ? 'SGST' : '',
      'Total',
    ].filter(Boolean)];

    const body = data.items.map((item) => [
      item.slNo,
      item.description,
      item.hsnCode,
      item.quantity,
      item.unit,
      `₹${item.unitPrice.toFixed(2)}`,
      `${item.discount}%`,
      `₹${item.taxableValue.toFixed(2)}`,
      gstMode === 'cgst_sgst' ? `₹${(item.cgstAmount || 0).toFixed(2)}` : `₹${(item.igstAmount || 0).toFixed(2)}`,
      gstMode === 'cgst_sgst' ? `₹${(item.sgstAmount || 0).toFixed(2)}` : '',
      `₹${item.totalAmount.toFixed(2)}`,
    ].filter((_, i) => gstMode === 'cgst_sgst' || i !== 9));

    autoTable(doc, {
      head,
      body,
      startY: y,
      margin: { left: 10, right: 10 },
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 5;

    // Totals section
    doc.setFontSize(8);
    const totals: Array<[string, string]> = [
      ['Subtotal', `₹${data.subtotal.toFixed(2)}`],
      data.totalDiscount > 0 ? ['Discount', `-₹${data.totalDiscount.toFixed(2)}`] : null,
      ['Taxable Amount', `₹${data.totalTaxableValue.toFixed(2)}`],
      data.totalCgst ? ['CGST', `₹${data.totalCgst.toFixed(2)}`] : null,
      data.totalSgst ? ['SGST', `₹${data.totalSgst.toFixed(2)}`] : null,
      data.totalIgst ? ['IGST', `₹${data.totalIgst.toFixed(2)}`] : null,
      data.totalCess ? ['Cess', `₹${data.totalCess.toFixed(2)}`] : null,
      data.roundOff !== 0 ? ['Round Off', `₹${data.roundOff.toFixed(2)}`] : null,
      ['Grand Total', `₹${data.grandTotal.toFixed(2)}`],
    ].filter(Boolean) as Array<[string, string]>;

    const totalsX = pageW - 80;
    totals.forEach(([label, value]) => {
      doc.setFont('helvetica', label === 'Grand Total' ? 'bold' : 'normal');
      doc.text(label, totalsX, y);
      doc.text(value, pageW - 12, y, { align: 'right' });
      y += 5;
    });

    if (data.amountInWords) {
      y += 3;
      doc.setFont('helvetica', 'italic').setFontSize(8);
      doc.text(`Amount in Words: ${data.amountInWords}`, 10, y);
      y += 8;
    }
  }

  // ─── Bank Details ─────────────────────────────────────────────────────────────
  if (bankBlock?.type === 'bank_details') {
    const b = bankBlock.data;
    doc.setFont('helvetica', 'bold').setFontSize(9);
    doc.text('Bank Details', 10, y);
    y += 5;
    doc.setFont('helvetica', 'normal').setFontSize(8);
    doc.text(`Bank: ${b.bankName} | A/C: ${b.accountNumber} | IFSC: ${b.ifscCode}`, 10, y);
    y += 4;
    doc.text(`Branch: ${b.branchName} | Type: ${b.accountType.toUpperCase()}`, 10, y);
    if (b.upiId) {
      y += 4;
      doc.text(`UPI: ${b.upiId}`, 10, y);
    }
    y += 10;
  }

  // ─── Terms ────────────────────────────────────────────────────────────────────
  if (termsBlock?.type === 'terms') {
    doc.setFont('helvetica', 'bold').setFontSize(9);
    doc.text('Terms & Conditions', 10, y);
    y += 5;
    doc.setFont('helvetica', 'normal').setFontSize(7.5);
    const lines = doc.splitTextToSize(termsBlock.data.terms || '', pageW - 20);
    doc.text(lines, 10, y);
    y += lines.length * 4 + 5;
  }

  // ─── Signature ────────────────────────────────────────────────────────────────
  if (signBlock?.type === 'signature') {
    const s = signBlock.data;
    doc.setFont('helvetica', 'normal').setFontSize(8);
    doc.line(pageW - 60, y, pageW - 10, y);
    y += 4;
    doc.text(s.signatoryName || 'Authorised Signatory', pageW - 35, y, { align: 'center' });
    if (s.designation) {
      y += 4;
      doc.text(s.designation, pageW - 35, y, { align: 'center' });
    }
  }

  const fileName = `${bill.meta.billNumber || 'bill'}_${bill.meta.id}.pdf`;
  doc.save(fileName.replace(/[/\\]/g, '-'));
}
