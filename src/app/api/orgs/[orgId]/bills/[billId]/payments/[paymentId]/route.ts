import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { db } from '@/lib/db';

type Params = { params: Promise<{ orgId: string; billId: string; paymentId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { orgId, billId, paymentId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = await checkPermission(user.id, orgId, 'bills:edit');
  if (denied) return denied;

  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.billId !== billId || payment.orgId !== orgId) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  await db.payment.delete({ where: { id: paymentId } });

  // Recalculate bill status after deletion
  const remaining = await db.payment.findMany({ where: { billId } });
  const bill = await db.bill.findUnique({ where: { id: billId } });
  if (bill && bill.status === 'paid') {
    const totalPaid = remaining.reduce((sum, p) => sum + p.amount, 0);
    const grandTotal = bill.grandTotal ?? 0;
    const newStatus = grandTotal > 0 && totalPaid >= grandTotal ? 'paid' : 'sent';
    if (newStatus !== bill.status) {
      await db.bill.update({ where: { id: billId }, data: { status: newStatus, updatedBy: user.id } });
    }
  }

  return Response.json({ ok: true });
}
