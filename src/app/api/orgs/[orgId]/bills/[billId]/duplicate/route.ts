import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import { db } from '@/lib/db';
import { getFinancialYear } from '@/lib/orgSetup';
import type { Block, BillType } from '@/types/bill';
import { writeAuditLog } from '@/lib/audit';

type Params = { params: Promise<{ orgId: string; billId: string }> };

const TYPE_CODES: Record<string, string> = {
  invoice: 'INV', proforma: 'PRF', credit_note: 'CN',
  debit_note: 'DN', delivery_challan: 'DC', purchase_order: 'PO', quotation: 'QT',
};

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

  const financialYear = getFinancialYear(new Date());

  const newBill = await db.$transaction(async (tx) => {
    const seq = await tx.invoiceSequence.upsert({
      where: { orgId_billType_financialYear: { orgId, billType: source.billType, financialYear } },
      create: {
        orgId, billType: source.billType, financialYear,
        prefix: '', typeCode: TYPE_CODES[source.billType] ?? 'DOC', zeroPadding: 4, currentValue: 1,
      },
      update: { currentValue: { increment: 1 } },
      select: { currentValue: true, prefix: true, typeCode: true, zeroPadding: true },
    });

    const billNumber = `${seq.prefix}${seq.typeCode}-${financialYear}-${String(seq.currentValue).padStart(seq.zeroPadding, '0')}`;

    return tx.bill.create({
      data: {
        orgId,
        billNumber,
        billType: source.billType,
        status: 'draft',
        financialYear,
        companyId: source.companyId,
        templateId: source.templateId,
        duplicatedFromId: source.id,
        currency: source.currency,
        tags: source.tags,
        blocksJson: source.blocksJson as never,
        globalCanvasJson: (source.globalCanvasJson ?? undefined) as never,
        schemaVersion: source.schemaVersion,
        buyerName: source.buyerName,
        grandTotal: source.grandTotal,
        createdBy: user.id,
        updatedBy: user.id,
      },
    });
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
