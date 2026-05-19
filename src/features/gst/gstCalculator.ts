import type { LineItem, ItemsTableData, TaxSummaryData } from '@/types/bill';
import type { GstMode, TaxLine } from '@/types/gst';

export function computeLineItem(
  item: Omit<LineItem, 'discountAmount' | 'taxableValue' | 'cgstRate' | 'sgstRate' | 'igstRate' | 'cgstAmount' | 'sgstAmount' | 'igstAmount' | 'cessAmount' | 'totalAmount'>,
  gstMode: GstMode
): LineItem {
  const gross = item.quantity * item.unitPrice;
  const discountAmount = (gross * item.discount) / 100;
  const taxableValue = gross - discountAmount;

  let cgstRate = 0, sgstRate = 0, igstRate = 0;
  let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;

  if (gstMode === 'cgst_sgst') {
    cgstRate = item.gstRate / 2;
    sgstRate = item.gstRate / 2;
    cgstAmount = round2(taxableValue * cgstRate / 100);
    sgstAmount = round2(taxableValue * sgstRate / 100);
  } else {
    igstRate = item.gstRate;
    igstAmount = round2(taxableValue * igstRate / 100);
  }

  const cessAmount = item.cessRate
    ? round2(taxableValue * item.cessRate / 100)
    : 0;

  const totalAmount = round2(
    taxableValue + cgstAmount + sgstAmount + igstAmount + cessAmount
  );

  return {
    ...item,
    discountAmount: round2(discountAmount),
    taxableValue: round2(taxableValue),
    cgstRate,
    sgstRate,
    igstRate,
    cgstAmount,
    sgstAmount,
    igstAmount,
    cessAmount,
    totalAmount,
  };
}

export function computeItemsTable(items: LineItem[], gstMode: GstMode): Omit<ItemsTableData, 'items' | 'gstMode'> {
  const subtotal = round2(items.reduce((s, i) => s + i.quantity * i.unitPrice, 0));
  const totalDiscount = round2(items.reduce((s, i) => s + i.discountAmount, 0));
  const totalTaxableValue = round2(items.reduce((s, i) => s + i.taxableValue, 0));
  const totalCgst = round2(items.reduce((s, i) => s + (i.cgstAmount ?? 0), 0));
  const totalSgst = round2(items.reduce((s, i) => s + (i.sgstAmount ?? 0), 0));
  const totalIgst = round2(items.reduce((s, i) => s + (i.igstAmount ?? 0), 0));
  const totalCess = round2(items.reduce((s, i) => s + (i.cessAmount ?? 0), 0));

  const rawTotal = totalTaxableValue + totalCgst + totalSgst + totalIgst + totalCess;
  const grandTotal = Math.round(rawTotal);
  const roundOff = round2(grandTotal - rawTotal);

  return {
    subtotal,
    totalDiscount,
    totalTaxableValue,
    totalCgst: gstMode === 'cgst_sgst' ? totalCgst : undefined,
    totalSgst: gstMode === 'cgst_sgst' ? totalSgst : undefined,
    totalIgst: gstMode === 'igst' ? totalIgst : undefined,
    totalCess: totalCess > 0 ? totalCess : undefined,
    roundOff,
    grandTotal,
    amountInWords: toIndianWords(grandTotal) + ' Only',
  };
}

export function computeTaxSummary(itemsData: ItemsTableData): TaxSummaryData {
  const gstMode = itemsData.gstMode;
  const groupMap = new Map<string, TaxLine>();

  for (const item of itemsData.items) {
    const key = `${item.hsnCode}_${item.gstRate}`;
    const existing = groupMap.get(key);
    if (existing) {
      existing.taxableValue += item.taxableValue;
      if (gstMode === 'cgst_sgst') {
        existing.breakdown.cgstAmount! += item.cgstAmount ?? 0;
        existing.breakdown.sgstAmount! += item.sgstAmount ?? 0;
      } else {
        existing.breakdown.igstAmount! += item.igstAmount ?? 0;
      }
      existing.breakdown.cessAmount = (existing.breakdown.cessAmount ?? 0) + (item.cessAmount ?? 0);
      existing.breakdown.totalTax = existing.breakdown.cgstAmount! + existing.breakdown.sgstAmount! + (existing.breakdown.igstAmount ?? 0) + (existing.breakdown.cessAmount ?? 0);
    } else {
      groupMap.set(key, {
        hsnCode: item.hsnCode,
        description: item.description,
        taxableValue: item.taxableValue,
        breakdown: {
          mode: gstMode,
          taxableAmount: item.taxableValue,
          cgstRate: item.cgstRate,
          sgstRate: item.sgstRate,
          igstRate: item.igstRate,
          cgstAmount: item.cgstAmount ?? 0,
          sgstAmount: item.sgstAmount ?? 0,
          igstAmount: item.igstAmount ?? 0,
          cessRate: item.cessRate,
          cessAmount: item.cessAmount ?? 0,
          totalTax: (item.cgstAmount ?? 0) + (item.sgstAmount ?? 0) + (item.igstAmount ?? 0) + (item.cessAmount ?? 0),
        },
      });
    }
  }

  const taxLines = Array.from(groupMap.values()).map((tl) => ({
    ...tl,
    taxableValue: round2(tl.taxableValue),
    breakdown: {
      ...tl.breakdown,
      cgstAmount: round2(tl.breakdown.cgstAmount ?? 0),
      sgstAmount: round2(tl.breakdown.sgstAmount ?? 0),
      igstAmount: round2(tl.breakdown.igstAmount ?? 0),
      cessAmount: round2(tl.breakdown.cessAmount ?? 0),
      totalTax: round2(tl.breakdown.totalTax),
    },
  }));

  return {
    taxLines,
    totalTaxableValue: itemsData.totalTaxableValue,
    totalCgst: itemsData.totalCgst,
    totalSgst: itemsData.totalSgst,
    totalIgst: itemsData.totalIgst,
    totalCess: itemsData.totalCess,
    totalTax: round2((itemsData.totalCgst ?? 0) + (itemsData.totalSgst ?? 0) + (itemsData.totalIgst ?? 0) + (itemsData.totalCess ?? 0)),
    grandTotal: itemsData.grandTotal,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Indian Amount in Words ───────────────────────────────────────────────────

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function numToWords(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numToWords(n % 100) : '');
  return '';
}

export function toIndianWords(amount: number): string {
  if (amount === 0) return 'Zero Rupees';
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  const parts: string[] = [];

  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const remainder = rupees % 1000;

  if (crore) parts.push(numToWords(crore) + ' Crore');
  if (lakh) parts.push(numToWords(lakh) + ' Lakh');
  if (thousand) parts.push(numToWords(thousand) + ' Thousand');
  if (remainder) parts.push(numToWords(remainder));

  let result = 'Rupees ' + parts.join(' ');
  if (paise > 0) result += ' and ' + numToWords(paise) + ' Paise';
  return result;
}
