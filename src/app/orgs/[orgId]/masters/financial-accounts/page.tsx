import { getSession } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { AccountsClient } from '@/components/financial-accounts/AccountsClient';

export const dynamic = 'force-dynamic';

export default async function FinancialAccountsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const user = await getSession();
  if (!user) redirect('/login');

  const perms = await getPermissions(user.id, orgId);
  if (!perms.has('masters:read')) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        You don't have permission to view financial accounts.
      </div>
    );
  }

  const accounts = await db.financialAccount.findMany({
    where: { orgId },
    include: { company: { select: { id: true, name: true } } },
    orderBy: { label: 'asc' },
  });

  const rows = accounts.map((a) => ({
    id: a.id,
    label: a.label,
    bankName: a.bankName,
    accountNumber: a.accountNumber,
    accountType: a.accountType as string,
    accountHolderName: a.accountHolderName,
    isActive: a.isActive,
    company: a.company ? { id: a.company.id, name: a.company.name } : null,
  }));

  return (
    <AccountsClient
      orgId={orgId}
      accounts={rows}
      canCreate={perms.has('masters:create')}
      canEdit={perms.has('masters:edit')}
      canDelete={perms.has('masters:delete')}
    />
  );
}
