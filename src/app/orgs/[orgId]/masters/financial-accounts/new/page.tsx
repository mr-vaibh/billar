import { getSession } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { AccountForm } from '@/components/financial-accounts/AccountForm';

export default async function NewAccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ companyId?: string }>;
}) {
  const { orgId } = await params;
  const { companyId } = await searchParams;
  const user = await getSession();
  if (!user) redirect('/login');

  const perms = await getPermissions(user.id, orgId);
  if (!perms.has('masters:create')) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        You don't have permission to create financial accounts.
      </div>
    );
  }

  const companies = await db.company.findMany({
    where: { orgId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  const backHref = companyId
    ? `/orgs/${orgId}/masters/companies/${companyId}`
    : `/orgs/${orgId}/masters/financial-accounts`;

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div className="space-y-1">
        <Link href={backHref} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
          <ChevronLeft className="h-4 w-4" />
          Back
        </Link>
        <h1 className="text-2xl font-bold">Add Financial Account</h1>
      </div>
      <AccountForm orgId={orgId} companies={companies} defaultCompanyId={companyId} />
    </div>
  );
}
