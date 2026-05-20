import { getSession } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import { db } from '@/lib/db';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { AccountForm } from '@/components/bank-accounts/AccountForm';

export const dynamic = 'force-dynamic';

export default async function EditAccountPage({
  params,
}: {
  params: Promise<{ orgId: string; accountId: string }>;
}) {
  const { orgId, accountId } = await params;
  const user = await getSession();
  if (!user) redirect('/login');

  const perms = await getPermissions(user.id, orgId);
  if (!perms.has('masters:read')) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        You don't have permission to view bank accounts.
      </div>
    );
  }

  const [account, companies] = await Promise.all([
    db.bankAccount.findUnique({ where: { id: accountId } }),
    db.company.findMany({
      where: { orgId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!account || account.orgId !== orgId) notFound();

  const backHref = account.companyId
    ? `/orgs/${orgId}/masters/companies/${account.companyId}`
    : `/orgs/${orgId}/masters/bank-accounts`;

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div className="space-y-1">
        <Link href={backHref} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
          <ChevronLeft className="h-4 w-4" />
          Back
        </Link>
        <h1 className="text-2xl font-bold">Edit Account</h1>
      </div>
      <AccountForm
        orgId={orgId}
        accountId={accountId}
        companies={companies}
        initial={{
          companyId: account.companyId ?? '',
          label: account.label,
          bankName: account.bankName,
          accountNumber: account.accountNumber,
          ifscCode: account.ifscCode,
          accountType: account.accountType,
          branchName: account.branchName,
          accountHolderName: account.accountHolderName,
          upiId: account.upiId ?? '',
          qrCodeBase64: account.qrCodeBase64 ?? '',
        }}
      />
    </div>
  );
}
