import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import { db } from '@/lib/db';
import type { Block, BillType } from '@/types/bill';
import { writeAuditLog } from '@/lib/audit';

type Params = { params: Promise<{ orgId: string; billId: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const { orgId, billId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const source = await db.bill.findUnique({ where: { id: billId } });
  if (!source || source.orgId !== orgId) return Response.json({ error: 'Not found' }, { status: 404 });

  const perms = await getPermissions(user.id, orgId);
  const createPerm = `bills:create:${source.billType}`;
  if (!perms.has(createPerm) && !perms.has('bills:create')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Clear the bill number from the duplicated blocks so the copy gets a fresh number on finalize
  const clearedBlocks = (source.blocksJson as unknown as Block[]).map((b) =>
    b.type === 'order_info' ? { ...b, data: { ...b.data, billNumber: '' } } : b
  );

  const newBill = await db.bill.create({
    data: {
      orgId,
      billNumber: '',
      billType: source.billType,
      status: 'draft',
      financialYear: source.financialYear,
      companyId: source.companyId,
      templateId: source.templateId,
      duplicatedFromId: source.id,
      currency: source.currency,
      tags: source.tags,
      blocksJson: clearedBlocks as never,
      globalCanvasJson: (source.globalCanvasJson ?? undefined) as never,
      schemaVersion: source.schemaVersion,
      buyerName: source.buyerName,
      grandTotal: source.grandTotal,
      createdBy: user.id,
      updatedBy: user.id,
    },
  });

  await writeAuditLog({ orgId, userId: user.id, action: 'bill:duplicate', resourceId: newBill.id, meta: { sourceId: billId } });

  return Response.json({
    meta: {
      id: newBill.id,
      billNumber: newBill.billNumber,
      billType: newBill.billType as BillType,
      status: newBill.status,
      financialYear: newBill.financialYear,
      companyId: newBill.companyId ?? undefined,
      duplicatedFromId: newBill.duplicatedFromId ?? undefined,
      currency: newBill.currency,
      buyerName: newBill.buyerName ?? undefined,
      grandTotal: newBill.grandTotal ?? undefined,
      tags: newBill.tags,
      createdAt: newBill.createdAt.toISOString(),
      updatedAt: newBill.updatedAt.toISOString(),
    },
    blocks: newBill.blocksJson,
    globalCanvasOverlay: newBill.globalCanvasJson ?? undefined,
    schemaVersion: newBill.schemaVersion,
  }, { status: 201 });
}
