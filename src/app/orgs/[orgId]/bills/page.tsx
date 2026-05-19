import { getSession } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { OrgBillListClient } from '@/components/bills/OrgBillListClient';

export const dynamic = 'force-dynamic';

export default async function OrgBillsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const user = await getSession();
  if (!user) redirect('/login');

  const perms = await getPermissions(user.id, orgId);
  if (!perms.has('bills:read')) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        You don't have permission to view bills.
      </div>
    );
  }

  const bills = await db.bill.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, billNumber: true, billType: true, status: true, financialYear: true,
      companyId: true, currency: true, buyerName: true, grandTotal: true,
      tags: true, createdAt: true, updatedAt: true,
    },
  });

  const rows = bills.map((b) => ({
    id: b.id,
    billNumber: b.billNumber,
    billType: b.billType as string,
    status: b.status as string,
    financialYear: b.financialYear,
    companyId: b.companyId ?? undefined,
    currency: b.currency,
    buyerName: b.buyerName ?? undefined,
    grandTotal: b.grandTotal ?? undefined,
    tags: b.tags,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  }));

  const canCreate =
    perms.has('bills:create:invoice') || perms.has('bills:create:proforma') ||
    perms.has('bills:create:credit_note') || perms.has('bills:create:debit_note') ||
    perms.has('bills:create:delivery_challan') || perms.has('bills:create:purchase_order') ||
    perms.has('bills:create:quotation');

  return (
    <OrgBillListClient
      orgId={orgId}
      initialBills={rows}
      canCreate={canCreate}
      canEdit={perms.has('bills:edit')}
      canDelete={perms.has('bills:delete')}
    />
  );
}
