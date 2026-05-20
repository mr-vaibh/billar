import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { db } from '@/lib/db';
import type { Block, BillType } from '@/types/bill';
import { writeAuditLog } from '@/lib/audit';
import { getFinancialYear } from '@/lib/orgSetup';

const TYPE_CODES: Record<string, string> = {
  invoice: 'INV', proforma: 'PRF', credit_note: 'CN',
  debit_note: 'DN', delivery_challan: 'DC', purchase_order: 'PO', quotation: 'QT',
};

type Params = { params: Promise<{ orgId: string; billId: string }> };

function extractBlocksMeta(blocks: Block[]) {
  let buyerName: string | undefined;
  let grandTotal: number | undefined;
  let dueDate: Date | undefined;
  let billDate: string | undefined;
  let blockBillNumber: string | undefined;

  for (const block of blocks) {
    if (block.type === 'party_info') buyerName = block.data.buyer.name || undefined;
    if (block.type === 'supplier_info' && !buyerName) buyerName = block.data.supplierName || undefined;
    if (block.type === 'items_table') grandTotal = block.data.grandTotal || undefined;
    if (block.type === 'order_info') {
      if (block.data.dueDate) {
        const d = new Date(block.data.dueDate);
        if (!isNaN(d.getTime())) dueDate = d;
      }
      billDate = block.data.billDate || undefined;
      blockBillNumber = block.data.billNumber || undefined;
    }
  }

  return { buyerName, grandTotal, dueDate, billDate, blockBillNumber };
}

function dbBillToClient(bill: { id: string; billNumber: string; billType: string; status: string; financialYear: string; companyId: string | null; templateId: string | null; duplicatedFromId: string | null; currency: string; buyerName: string | null; grandTotal: number | null; tags: string[]; blocksJson: unknown; globalCanvasJson: unknown; schemaVersion: number; createdAt: Date; updatedAt: Date }) {
  return {
    meta: {
      id: bill.id,
      billNumber: bill.billNumber,
      billType: bill.billType as BillType,
      status: bill.status,
      financialYear: bill.financialYear,
      companyId: bill.companyId ?? undefined,
      templateId: bill.templateId ?? undefined,
      duplicatedFromId: bill.duplicatedFromId ?? undefined,
      currency: bill.currency,
      buyerName: bill.buyerName ?? undefined,
      grandTotal: bill.grandTotal ?? undefined,
      tags: bill.tags,
      createdAt: bill.createdAt.toISOString(),
      updatedAt: bill.updatedAt.toISOString(),
    },
    blocks: bill.blocksJson,
    globalCanvasOverlay: bill.globalCanvasJson ?? undefined,
    schemaVersion: bill.schemaVersion,
  };
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { orgId, billId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = await checkPermission(user.id, orgId, 'bills:read');
  if (denied) return denied;

  const bill = await db.bill.findUnique({ where: { id: billId } });
  if (!bill || bill.orgId !== orgId) return Response.json({ error: 'Not found' }, { status: 404 });

  return Response.json(dbBillToClient(bill));
}

const updateSchema = z.object({
  status: z.enum(['draft', 'finalized', 'sent', 'paid', 'cancelled']).optional(),
  companyId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  blocksJson: z.array(z.unknown()).optional(),
  globalCanvasJson: z.unknown().optional().nullable(),
  schemaVersion: z.number().int().optional(),
});

export async function PUT(request: NextRequest, { params }: Params) {
  const { orgId, billId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = await checkPermission(user.id, orgId, 'bills:edit');
  if (denied) return denied;

  const bill = await db.bill.findUnique({ where: { id: billId } });
  if (!bill || bill.orgId !== orgId) return Response.json({ error: 'Not found' }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { buyerName, grandTotal, dueDate, billDate, blockBillNumber } = parsed.data.blocksJson
    ? extractBlocksMeta(parsed.data.blocksJson as Block[])
    : {};

  const { status, companyId, tags, blocksJson, globalCanvasJson, schemaVersion } = parsed.data;

  // Assign bill number when finalizing a bill that has none yet
  const needsNumber = status === 'finalized' && !bill.billNumber && !blockBillNumber;

  let updated: Awaited<ReturnType<typeof db.bill.update>>;

  if (needsNumber) {
    const date = billDate ? new Date(billDate) : new Date();
    const financialYear = getFinancialYear(isNaN(date.getTime()) ? new Date() : date);

    updated = await db.$transaction(async (tx) => {
      const seq = await tx.invoiceSequence.upsert({
        where: { orgId_billType_financialYear: { orgId, billType: bill.billType, financialYear } },
        create: {
          orgId,
          billType: bill.billType,
          financialYear,
          prefix: '',
          typeCode: TYPE_CODES[bill.billType] ?? 'DOC',
          zeroPadding: 4,
          currentValue: 1,
        },
        update: { currentValue: { increment: 1 } },
        select: { currentValue: true, prefix: true, typeCode: true, zeroPadding: true },
      });

      // Guard against reset: find the highest existing number in this series
      const prefix = seq.prefix;
      const typeCode = seq.typeCode;
      const seriesPrefix = `${prefix}${typeCode}-${financialYear}-`;
      const maxExisting = await tx.bill.findFirst({
        where: { orgId, billType: bill.billType, financialYear, billNumber: { startsWith: seriesPrefix } },
        orderBy: { billNumber: 'desc' },
        select: { billNumber: true },
      });
      const existingMax = maxExisting
        ? parseInt(maxExisting.billNumber.slice(seriesPrefix.length), 10)
        : 0;
      const nextValue = Math.max(seq.currentValue, existingMax + 1);

      // Sync sequence counter if we jumped ahead
      if (nextValue > seq.currentValue) {
        await tx.invoiceSequence.update({
          where: { orgId_billType_financialYear: { orgId, billType: bill.billType, financialYear } },
          data: { currentValue: nextValue },
        });
      }

      const newBillNumber = `${prefix}${typeCode}-${financialYear}-${String(nextValue).padStart(seq.zeroPadding, '0')}`;

      // Patch the bill number into the order_info block so the document shows it
      const patchedBlocks = blocksJson
        ? (blocksJson as Block[]).map((b) =>
            b.type === 'order_info'
              ? { ...b, data: { ...(b as Block & { type: 'order_info' }).data, billNumber: newBillNumber } }
              : b
          )
        : undefined;

      return tx.bill.update({
        where: { id: billId },
        data: {
          billNumber: newBillNumber,
          financialYear,
          ...(status !== undefined ? { status } : {}),
          ...(companyId !== undefined ? { companyId } : {}),
          ...(tags !== undefined ? { tags } : {}),
          ...(patchedBlocks !== undefined ? { blocksJson: patchedBlocks as never } : {}),
          ...(globalCanvasJson !== undefined ? { globalCanvasJson: (globalCanvasJson ?? undefined) as never } : {}),
          ...(schemaVersion !== undefined ? { schemaVersion } : {}),
          ...(buyerName !== undefined ? { buyerName } : {}),
          ...(grandTotal !== undefined ? { grandTotal } : {}),
          ...(dueDate !== undefined ? { dueDate } : {}),
          updatedBy: user.id,
        },
      });
    });
  } else {
    updated = await db.bill.update({
      where: { id: billId },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(companyId !== undefined ? { companyId } : {}),
        ...(tags !== undefined ? { tags } : {}),
        ...(blocksJson !== undefined ? { blocksJson: blocksJson as never } : {}),
        ...(globalCanvasJson !== undefined ? { globalCanvasJson: (globalCanvasJson ?? undefined) as never } : {}),
        ...(schemaVersion !== undefined ? { schemaVersion } : {}),
        ...(buyerName !== undefined ? { buyerName } : {}),
        ...(grandTotal !== undefined ? { grandTotal } : {}),
        ...(dueDate !== undefined ? { dueDate } : {}),
        // Keep billNumber in sync with what user typed in order_info block
        ...(blockBillNumber !== undefined ? { billNumber: blockBillNumber } : {}),
        updatedBy: user.id,
      },
    });
  }

  await writeAuditLog({ orgId, userId: user.id, action: 'bill:update', resourceId: billId });

  return Response.json(dbBillToClient(updated));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { orgId, billId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = await checkPermission(user.id, orgId, 'bills:delete');
  if (denied) return denied;

  const bill = await db.bill.findUnique({ where: { id: billId } });
  if (!bill || bill.orgId !== orgId) return Response.json({ error: 'Not found' }, { status: 404 });

  await db.bill.delete({ where: { id: billId } });

  await writeAuditLog({ orgId, userId: user.id, action: 'bill:delete', resourceId: billId });

  return Response.json({ ok: true });
}
