import { getSession } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import { db } from '@/lib/db';
import { redirect, notFound } from 'next/navigation';
import { BillPreviewPage } from '@/components/bills/BillPreviewPage';
import type { Bill, BillType } from '@/types/bill';

export const dynamic = 'force-dynamic';

export default async function OrgBillPreviewPage({
  params,
}: {
  params: Promise<{ orgId: string; billId: string }>;
}) {
  const { orgId, billId } = await params;
  const user = await getSession();
  if (!user) redirect('/login');

  const perms = await getPermissions(user.id, orgId);
  if (!perms.has('bills:read')) {
    return <div className="p-8 text-sm text-muted-foreground">You don't have permission to view bills.</div>;
  }

  const bill = await db.bill.findUnique({ where: { id: billId } });
  if (!bill || bill.orgId !== orgId) notFound();

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
