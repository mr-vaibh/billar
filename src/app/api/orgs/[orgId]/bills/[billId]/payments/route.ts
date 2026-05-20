import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { db } from '@/lib/db';

type Params = { params: Promise<{ orgId: string; billId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { orgId, billId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = await checkPermission(user.id, orgId, 'bills:read');
  if (denied) return denied;

  const bill = await db.bill.findUnique({ where: { id: billId } });
  if (!bill || bill.orgId !== orgId) return Response.json({ error: 'Not found' }, { status: 404 });

  const payments = await db.payment.findMany({
    where: { billId },
    orderBy: { paidAt: 'desc' },
  });

  return Response.json(payments);
}

const paymentSchema = z.object({
  amount: z.number().positive(),
  paidAt: z.string().datetime(),
  mode: z.enum(['cash', 'upi', 'neft', 'rtgs', 'cheque', 'other']),
  reference: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export async function POST(request: NextRequest, { params }: Params) {
  const { orgId, billId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = await checkPermission(user.id, orgId, 'bills:edit');
  if (denied) return denied;

  const bill = await db.bill.findUnique({ where: { id: billId }, include: { payments: true } });
  if (!bill || bill.orgId !== orgId) return Response.json({ error: 'Not found' }, { status: 404 });
  if (bill.status === 'cancelled') return Response.json({ error: 'Cannot record payment on a cancelled bill' }, { status: 400 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const payment = await db.payment.create({
    data: {
      orgId,
      billId,
      amount: parsed.data.amount,
      paidAt: new Date(parsed.data.paidAt),
      mode: parsed.data.mode,
      reference: parsed.data.reference ?? null,
      notes: parsed.data.notes ?? null,
      recordedBy: user.id,
    },
  });

  // Only auto-mark as paid when fully settled — never change status otherwise
  const totalPaid = bill.payments.reduce((sum, p) => sum + p.amount, 0) + parsed.data.amount;
  const grandTotal = bill.grandTotal ?? 0;
  if (grandTotal > 0 && totalPaid >= grandTotal && bill.status !== 'paid') {
    await db.bill.update({ where: { id: billId }, data: { status: 'paid', updatedBy: user.id } });
  }

  return Response.json(payment, { status: 201 });
}
