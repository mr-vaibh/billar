import { getSession } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { CustomersClient } from '@/components/customers/CustomersClient';

export const dynamic = 'force-dynamic';

export default async function CustomersPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const user = await getSession();
  if (!user) redirect('/login');

  const perms = await getPermissions(user.id, orgId);
  if (!perms.has('masters:read')) {
    return <div className="p-8 text-sm text-muted-foreground">You don't have permission to view customers.</div>;
  }

  const customers = await db.customer.findMany({ where: { orgId, isActive: true }, orderBy: { name: 'asc' } });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Customers</h1>
        <p className="text-sm text-muted-foreground mt-1">Saved buyer contacts for quick auto-fill.</p>
      </div>
      <CustomersClient orgId={orgId} initialCustomers={customers} />
    </div>
  );
}
