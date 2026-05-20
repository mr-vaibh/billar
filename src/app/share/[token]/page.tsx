import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { BillPreviewPage } from '@/components/bills/BillPreviewPage';
import type { Bill, BillType } from '@/types/bill';

export const dynamic = 'force-dynamic';

export default async function PublicSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const bill = await db.bill.findUnique({ where: { shareToken: token } });
  if (!bill) notFound();

  const initialBill: Bill = {
    meta: {
      id: bill.id,
      billNumber: bill.billNumber,
      billType: bill.billType as BillType,
      status: bill.status as Bill['meta']['status'],
      financialYear: bill.financialYear,
      companyId: bill.companyId ?? undefined,
      templateId: bill.templateId ?? undefined,
      currency: bill.currency,
      buyerName: bill.buyerName ?? undefined,
      grandTotal: bill.grandTotal ?? undefined,
      tags: bill.tags,
      createdAt: bill.createdAt.toISOString(),
      updatedAt: bill.updatedAt.toISOString(),
    },
    blocks: bill.blocksJson as unknown as Bill['blocks'],
    globalCanvasOverlay: bill.globalCanvasJson as unknown as Bill['globalCanvasOverlay'],
    schemaVersion: bill.schemaVersion,
  };

  return <BillPreviewPage bill={initialBill} />;
}
