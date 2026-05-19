import { getSession } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { CompaniesClient } from '@/components/companies/CompaniesClient';

export const dynamic = 'force-dynamic';

export default async function CompaniesPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const user = await getSession();
  if (!user) redirect('/login');

  const perms = await getPermissions(user.id, orgId);
  if (!perms.has('masters:read')) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        You don't have permission to view companies.
      </div>
    );
  }

  const companies = await db.company.findMany({
    where: { orgId },
    include: { _count: { select: { financialAccounts: { where: { isActive: true } } } } },
    orderBy: { name: 'asc' },
  });

  const rows = companies.map((c) => ({
    id: c.id,
    name: c.name,
    gstin: c.gstin,
    city: c.city,
    state: c.state,
    isActive: c.isActive,
    accountCount: c._count.financialAccounts,
  }));

  return (
    <CompaniesClient
      orgId={orgId}
      companies={rows}
      canCreate={perms.has('masters:create')}
      canEdit={perms.has('masters:edit')}
      canDelete={perms.has('masters:delete')}
    />
  );
}
