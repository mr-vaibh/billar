import type { Bill } from '@/types/bill';
import { saveAs } from 'file-saver';

export async function exportToWord(bill: Bill): Promise<void> {
  const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, AlignmentType, BorderStyle, WidthType } = await import('docx');

  const companyBlock = bill.blocks.find((b) => b.type === 'company_header');
  const partyBlock = bill.blocks.find((b) => b.type === 'party_info');
  const orderBlock = bill.blocks.find((b) => b.type === 'order_info');
  const itemsBlock = bill.blocks.find((b) => b.type === 'items_table');
  const bankBlock = bill.blocks.find((b) => b.type === 'bank_details');
  const termsBlock = bill.blocks.find((b) => b.type === 'terms');
  const signBlock = bill.blocks.find((b) => b.type === 'signature');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sections: any[] = [];

  // Company Header
  if (companyBlock?.type === 'company_header') {
    const c = companyBlock.data;
    sections.push(
      new Paragraph({ text: c.companyName, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
      new Paragraph({ text: `${c.address}, ${c.city}, ${c.state} - ${c.pincode}`, alignment: AlignmentType.CENTER }),
      new Paragraph({ text: `Ph: ${c.phone} | Email: ${c.email}`, alignment: AlignmentType.CENTER }),
      new Paragraph({ text: `GSTIN: ${c.gstin || '-'} | PAN: ${c.pan || '-'}`, alignment: AlignmentType.CENTER }),
      new Paragraph({ text: '' }),
    );
  }

  // Bill type title
  const billTypeLabels: Record<string, string> = {
    invoice: 'TAX INVOICE', proforma: 'PROFORMA INVOICE', credit_note: 'CREDIT NOTE',
    debit_note: 'DEBIT NOTE', delivery_challan: 'DELIVERY CHALLAN',
    purchase_order: 'PURCHASE ORDER', quotation: 'QUOTATION',
  };
  sections.push(
    new Paragraph({ text: billTypeLabels[bill.meta.billType] || 'INVOICE', heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER }),
    new Paragraph({ text: '' }),
  );

  // Party & Order Info table
  if (partyBlock?.type === 'party_info' || orderBlock?.type === 'order_info') {
    const seller = partyBlock?.type === 'party_info' ? partyBlock.data.seller : null;
    const buyer = partyBlock?.type === 'party_info' ? partyBlock.data.buyer : null;
    const order = orderBlock?.type === 'order_info' ? orderBlock.data : null;

    const infoTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'From:', bold: true })] }), new Paragraph({ text: seller?.name || '' }), new Paragraph({ text: seller?.address || '' }), new Paragraph({ text: `GSTIN: ${seller?.gstin || '-'}` })], width: { size: 50, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'To:', bold: true })] }), new Paragraph({ text: buyer?.name || '' }), new Paragraph({ text: buyer?.address || '' }), new Paragraph({ text: `GSTIN: ${buyer?.gstin || '-'}` })], width: { size: 50, type: WidthType.PERCENTAGE } }),
          ],
        }),
        ...(order ? [new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: `Bill No: ${order.billNumber || '-'}  |  Date: ${order.billDate || '-'}` }), new Paragraph({ text: `PO: ${order.poNumber || '-'}  |  Place of Supply: ${order.placeOfSupply || '-'}` })] }),
            new TableCell({ children: [new Paragraph({ text: order.dueDate ? `Due Date: ${order.dueDate}` : '' })] }),
          ],
        })] : []),
      ],
    });
    sections.push(infoTable, new Paragraph({ text: '' }));
  }

  // Items Table
  if (itemsBlock?.type === 'items_table') {
    const data = itemsBlock.data;
    const gstMode = data.gstMode;

    const headerCells = ['#', 'Description', 'HSN', 'Qty', 'Unit', 'Rate', 'Disc%', 'Taxable',
      gstMode === 'cgst_sgst' ? 'CGST' : 'IGST',
      gstMode === 'cgst_sgst' ? 'SGST' : '',
      'Total',
    ].filter(Boolean).map((h) => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF' })] })],
      shading: { fill: '1E293B' },
    }));

    const itemRows = data.items.map((item) => {
      const cells = [
        String(item.slNo), item.description, item.hsnCode, String(item.quantity), item.unit,
        `₹${item.unitPrice.toFixed(2)}`, `${item.discount}%`, `₹${item.taxableValue.toFixed(2)}`,
        gstMode === 'cgst_sgst' ? `₹${(item.cgstAmount || 0).toFixed(2)}` : `₹${(item.igstAmount || 0).toFixed(2)}`,
        gstMode === 'cgst_sgst' ? `₹${(item.sgstAmount || 0).toFixed(2)}` : '',
        `₹${item.totalAmount.toFixed(2)}`,
      ].filter((_, i) => gstMode === 'cgst_sgst' || i !== 9);
      return new TableRow({ children: cells.map((c) => new TableCell({ children: [new Paragraph({ text: c })] })) });
    });

    sections.push(
      new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: headerCells }), ...itemRows] }),
      new Paragraph({ text: '' }),
      new Paragraph({ children: [new TextRun({ text: `Grand Total: ₹${data.grandTotal.toFixed(2)}`, bold: true })] }),
      new Paragraph({ children: [new TextRun({ text: data.amountInWords, italics: true })] }),
      new Paragraph({ text: '' }),
    );
  }

  // Bank Details
  if (bankBlock?.type === 'bank_details') {
    const b = bankBlock.data;
    sections.push(
      new Paragraph({ children: [new TextRun({ text: 'Bank Details', bold: true })] }),
      new Paragraph({ text: `Bank: ${b.bankName} | A/C: ${b.accountNumber} | IFSC: ${b.ifscCode}` }),
      new Paragraph({ text: `Branch: ${b.branchName}${b.upiId ? ` | UPI: ${b.upiId}` : ''}` }),
      new Paragraph({ text: '' }),
    );
  }

  // Terms
  if (termsBlock?.type === 'terms') {
    sections.push(
      new Paragraph({ children: [new TextRun({ text: 'Terms & Conditions', bold: true })] }),
      new Paragraph({ text: termsBlock.data.terms }),
      ...(termsBlock.data.declaration ? [new Paragraph({ children: [new TextRun({ text: termsBlock.data.declaration, italics: true })] })] : []),
      new Paragraph({ text: '' }),
    );
  }

  // Signature
  if (signBlock?.type === 'signature') {
    sections.push(
      new Paragraph({ text: '' }),
      new Paragraph({ text: '____________________________', alignment: AlignmentType.RIGHT }),
      new Paragraph({ children: [new TextRun({ text: signBlock.data.signatoryName || 'Authorised Signatory', bold: true })], alignment: AlignmentType.RIGHT }),
      ...(signBlock.data.designation ? [new Paragraph({ text: signBlock.data.designation, alignment: AlignmentType.RIGHT })] : []),
    );
  }

  const doc = new Document({
    sections: [{ children: sections }],
    creator: 'Billar',
    title: `${bill.meta.billType} - ${bill.meta.billNumber}`,
  });

  const buffer = await Packer.toBlob(doc);
  const blob = buffer;
  const fileName = `${bill.meta.billNumber || 'bill'}_${bill.meta.id}.docx`.replace(/[/\\]/g, '-');
  saveAs(blob, fileName);
}
