import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { db } from '@/lib/db';
import type { Block, BillType } from '@/types/bill';
import { writeAuditLog } from '@/lib/audit';

type Params = { params: Promise<{ orgId: string; billId: string }> };

function extractBlocksMeta(blocks: Block[]) {
  let buyerName: string | undefined;
  let grandTotal: number | undefined;

  for (const block of blocks) {
    if (block.type === 'party_info') buyerName = block.data.buyer.name || undefined;
    if (block.type === 'supplier_info' && !buyerName) buyerName = block.data.supplierName || undefined;
    if (block.type === 'items_table') grandTotal = block.data.grandTotal || undefined;
  }

  return { buyerName, grandTotal };
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

  const { buyerName, grandTotal } = parsed.data.blocksJson
    ? extractBlocksMeta(parsed.data.blocksJson as Block[])
    : {};

  const { status, companyId, tags, blocksJson, globalCanvasJson, schemaVersion } = parsed.data;
  const updated = await db.bill.update({
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
      updatedBy: user.id,
    },
  });

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
