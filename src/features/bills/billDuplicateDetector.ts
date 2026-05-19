import type { Bill, BillMeta, DuplicateDetectionResult, DuplicateFieldMatch } from '@/types/bill';

function getOrderInfo(bill: Bill) {
  return bill.blocks.find((b) => b.type === 'order_info')?.data as { billNumber?: string; poNumber?: string; billDate?: string; dueDate?: string } | undefined;
}

function getPartyInfo(bill: Bill) {
  return bill.blocks.find((b) => b.type === 'party_info')?.data as { buyer?: { name?: string; gstin?: string }; seller?: { gstin?: string } } | undefined;
}

function getItemsTable(bill: Bill) {
  return bill.blocks.find((b) => b.type === 'items_table')?.data as { grandTotal?: number; items?: Array<{ hsnCode?: string }> } | undefined;
}

function withinDays(dateA?: string, dateB?: string, days = 3): boolean {
  if (!dateA || !dateB) return false;
  const diff = Math.abs(new Date(dateA).getTime() - new Date(dateB).getTime());
  return diff <= days * 86400000;
}

function hsnOverlap(a?: string[], b?: string[]): number {
  if (!a?.length || !b?.length) return 0;
  const setA = new Set(a);
  const intersection = b.filter((h) => setA.has(h)).length;
  return intersection / Math.max(setA.size, b.length);
}

export function detectDuplicates(
  current: Bill,
  allMetas: BillMeta[],
  getBill: (id: string) => Bill | null
): DuplicateDetectionResult {
  const currentOrder = getOrderInfo(current);
  const currentParty = getPartyInfo(current);
  const currentItems = getItemsTable(current);

  const matches: DuplicateFieldMatch[] = [];
  const billScores: Array<{ id: string; billNumber: string; score: number }> = [];

  for (const meta of allMetas) {
    if (meta.id === current.meta.id) continue;

    const other = getBill(meta.id);
    if (!other) continue;

    const otherOrder = getOrderInfo(other);
    const otherParty = getPartyInfo(other);
    const otherItems = getItemsTable(other);

    let score = 0;
    const billMatches: DuplicateFieldMatch[] = [];

    // ─── High weight: Bill number (20pts) and PO number (20pts) ───────────────
    if (currentOrder?.billNumber && currentOrder.billNumber === otherOrder?.billNumber) {
      score += 20;
      billMatches.push({ field: 'Bill Number', value: currentOrder.billNumber, matchedBillId: meta.id, matchedBillNumber: meta.billNumber });
    }

    if (currentOrder?.poNumber && currentOrder.poNumber === otherOrder?.poNumber) {
      score += 20;
      billMatches.push({ field: 'PO Number', value: currentOrder.poNumber, matchedBillId: meta.id, matchedBillNumber: meta.billNumber });
    }

    // ─── Medium weight: Buyer (15pts), Seller GSTIN (10pts), Date (10pts) ─────
    if (currentParty?.buyer?.name && currentParty.buyer.name.toLowerCase() === otherParty?.buyer?.name?.toLowerCase()) {
      score += 8;
      billMatches.push({ field: 'Buyer Name', value: currentParty.buyer.name, matchedBillId: meta.id, matchedBillNumber: meta.billNumber });
    }

    if (currentParty?.buyer?.gstin && currentParty.buyer.gstin === otherParty?.buyer?.gstin) {
      score += 7;
      billMatches.push({ field: 'Buyer GSTIN', value: currentParty.buyer.gstin, matchedBillId: meta.id, matchedBillNumber: meta.billNumber });
    }

    if (currentParty?.seller?.gstin && currentParty.seller.gstin === otherParty?.seller?.gstin) {
      score += 10;
    }

    if (withinDays(currentOrder?.billDate, otherOrder?.billDate, 3)) {
      score += 10;
    }

    // ─── Low weight: Grand total (10pts), HSN overlap (15pts) ─────────────────
    if (currentItems?.grandTotal && otherItems?.grandTotal) {
      const diff = Math.abs(currentItems.grandTotal - otherItems.grandTotal) / Math.max(currentItems.grandTotal, otherItems.grandTotal);
      if (diff < 0.01) {
        score += 10;
        billMatches.push({ field: 'Grand Total', value: `₹${currentItems.grandTotal.toFixed(2)}`, matchedBillId: meta.id, matchedBillNumber: meta.billNumber });
      }
    }

    const currentHsn = currentItems?.items?.map((i) => i.hsnCode).filter(Boolean) as string[];
    const otherHsn = otherItems?.items?.map((i) => i.hsnCode).filter(Boolean) as string[];
    const overlap = hsnOverlap(currentHsn, otherHsn);
    if (overlap >= 0.8) {
      score += Math.round(overlap * 15);
    }

    if (score > 0) {
      billScores.push({ id: meta.id, billNumber: meta.billNumber, score });
      for (const m of billMatches) {
        if (!matches.find((x) => x.field === m.field && x.matchedBillId === m.matchedBillId)) {
          matches.push(m);
        }
      }
    }
  }

  billScores.sort((a, b) => b.score - a.score);
  const topScore = billScores[0]?.score ?? 0;

  return {
    isDuplicate: topScore >= 60,
    score: topScore,
    matches,
    matchedBills: billScores.slice(0, 5),
  };
}
