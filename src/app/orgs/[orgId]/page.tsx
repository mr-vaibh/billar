import { getSession } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { OrgDashboardClient } from '@/components/bills/OrgDashboardClient';

export const dynamic = 'force-dynamic';

export default async function OrgHomePage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const user = await getSession();
  if (!user) redirect('/login');

  const perms = await getPermissions(user.id, orgId);
  if (!perms.has('bills:read')) {
    redirect(`/orgs/${orgId}/bills`);
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [bills, payments, recentBills] = await Promise.all([
    db.bill.findMany({
      where: { orgId, status: { not: 'cancelled' } },
      select: { id: true, status: true, grandTotal: true, dueDate: true, createdAt: true },
    }),
    db.payment.findMany({
      where: { orgId },
      select: { billId: true, amount: true, paidAt: true },
    }),
    db.bill.findMany({
      where: { orgId },
      select: { id: true, billNumber: true, billType: true, status: true, buyerName: true, grandTotal: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  const paidByBill = new Map<string, number>();
  let collectedThisMonth = 0;
  for (const p of payments) {
    paidByBill.set(p.billId, (paidByBill.get(p.billId) ?? 0) + p.amount);
    if (p.paidAt >= monthStart) collectedThisMonth += p.amount;
  }

  let totalBilledThisMonth = 0;
  let outstanding = 0;
  let overdue = 0;

  for (const bill of bills) {
    const total = bill.grandTotal ?? 0;
    const paid = paidByBill.get(bill.id) ?? 0;
    const remaining = Math.max(0, total - paid);

    if (bill.createdAt >= monthStart) totalBilledThisMonth += total;

    if (['finalized', 'sent'].includes(bill.status) && remaining > 0) {
      if (bill.dueDate && bill.dueDate < today) {
        overdue += remaining;
      } else {
        outstanding += remaining;
      }
    }
  }

  const serializedRecent = recentBills.map((b) => ({
    id: b.id,
    billNumber: b.billNumber,
    billType: b.billType,
    status: b.status,
    buyerName: b.buyerName,
    grandTotal: b.grandTotal,
    createdAt: b.createdAt.toISOString(),
  }));

  return (
    <OrgDashboardClient
      orgId={orgId}
      metrics={{ totalBilledThisMonth, collectedThisMonth, outstanding, overdue }}
      recentBills={serializedRecent}
    />
  );
}
