import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { checkPermission, getPermissions } from '@/lib/permissions';
import { db } from '@/lib/db';
import { getFinancialYear } from '@/lib/orgSetup';
import type { Block, BillType } from '@/types/bill';
import { writeAuditLog } from '@/lib/audit';

type Params = { params: Promise<{ orgId: string }> };


function extractBlocksMeta(blocks: Block[]) {
  let buyerName: string | undefined;
  let grandTotal: number | undefined;
  let billDate: string | undefined;

  for (const block of blocks) {
    if (block.type === 'party_info') buyerName = block.data.buyer.name || undefined;
    if (block.type === 'supplier_info' && !buyerName) buyerName = block.data.supplierName || undefined;
    if (block.type === 'items_table') grandTotal = block.data.grandTotal || undefined;
    if (block.type === 'order_info') billDate = block.data.billDate || undefined;
  }

  return { buyerName, grandTotal, billDate };
}

export async function GET(req: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = await checkPermission(user.id, orgId, 'bills:read');
  if (denied) return denied;

  const url = req.nextUrl;
  const status = url.searchParams.get('status');
  const billType = url.searchParams.get('billType');
  const companyId = url.searchParams.get('companyId');

  const bills = await db.bill.findMany({
    where: {
      orgId,
      ...(status ? { status: status as never } : {}),
      ...(billType ? { billType: billType as never } : {}),
      ...(companyId ? { companyId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, billNumber: true, billType: true, status: true, financialYear: true,
      companyId: true, templateId: true, duplicatedFromId: true, currency: true,
      buyerName: true, grandTotal: true, tags: true, createdAt: true, updatedAt: true,
    },
  });

  return Response.json(bills.map((b) => ({
    id: b.id,
    billNumber: b.billNumber,
    billType: b.billType,
    status: b.status,
    financialYear: b.financialYear,
    companyId: b.companyId,
    templateId: b.templateId,
    duplicatedFromId: b.duplicatedFromId,
    currency: b.currency,
    buyerName: b.buyerName,
    grandTotal: b.grandTotal,
    tags: b.tags,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  })));
}

const createSchema = z.object({
  billType: z.enum(['invoice', 'proforma', 'credit_note', 'debit_note', 'delivery_challan', 'purchase_order', 'quotation']),
  status: z.enum(['draft', 'finalized', 'sent', 'paid', 'cancelled']).default('draft'),
  companyId: z.string().optional().nullable(),
  templateId: z.string().optional().nullable(),
  duplicatedFromId: z.string().optional().nullable(),
  currency: z.string().default('INR'),
  tags: z.array(z.string()).default([]),
  blocksJson: z.array(z.unknown()),
  globalCanvasJson: z.unknown().optional().nullable(),
  schemaVersion: z.number().int().default(1),
});

export async function POST(request: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  // Check per-type create permission
  const perms = await getPermissions(user.id, orgId);
  const createPerm = `bills:create:${parsed.data.billType}`;
  if (!perms.has(createPerm) && !perms.has('bills:create')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const blocks = parsed.data.blocksJson as Block[];
  const { buyerName, grandTotal, billDate } = extractBlocksMeta(blocks);
  const date = billDate ? new Date(billDate) : new Date();
  const financialYear = getFinancialYear(isNaN(date.getTime()) ? new Date() : date);

  const bill = await db.bill.create({
    data: {
      orgId,
      billNumber: '',
      billType: parsed.data.billType,
      status: parsed.data.status,
      financialYear,
      companyId: parsed.data.companyId ?? null,
      templateId: parsed.data.templateId ?? null,
      duplicatedFromId: parsed.data.duplicatedFromId ?? null,
      currency: parsed.data.currency,
      tags: parsed.data.tags,
      blocksJson: parsed.data.blocksJson as never,
      globalCanvasJson: (parsed.data.globalCanvasJson ?? undefined) as never,
      schemaVersion: parsed.data.schemaVersion,
      buyerName: buyerName ?? null,
      grandTotal: grandTotal ?? null,
      createdBy: user.id,
      updatedBy: user.id,
    },
  });

  await writeAuditLog({ orgId, userId: user.id, action: 'bill:create', resourceId: bill.id });

  return Response.json(dbBillToClient(bill), { status: 201 });
}

function dbBillToClient(bill: Awaited<ReturnType<typeof db.bill.create>>) {
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
