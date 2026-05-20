import { getSession } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import { db } from '@/lib/db';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { CompanyEditClient } from '@/components/companies/CompanyEditClient';

export const dynamic = 'force-dynamic';

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ orgId: string; companyId: string }>;
}) {
  const { orgId, companyId } = await params;
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

  const company = await db.company.findUnique({
    where: { id: companyId },
    include: {
      bankAccounts: {
        orderBy: { label: 'asc' },
      },
    },
  });

  if (!company || company.orgId !== orgId) notFound();

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div className="space-y-1">
        <Link href={`/orgs/${orgId}/masters/companies`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
          <ChevronLeft className="h-4 w-4" />
          Back to Companies
        </Link>
        <h1 className="text-2xl font-bold">{company.name}</h1>
      </div>
      <CompanyEditClient
        orgId={orgId}
        company={{
          id: company.id,
          name: company.name,
          gstin: company.gstin ?? '',
          pan: company.pan ?? '',
          cin: company.cin ?? '',
          tagline: company.tagline ?? '',
          address: company.address,
          city: company.city,
          state: company.state,
          pincode: company.pincode,
          phone: company.phone ?? '',
          email: company.email ?? '',
          website: company.website ?? '',
          logoBase64: company.logoBase64 ?? '',
          isActive: company.isActive,
        }}
        accounts={company.bankAccounts.map((a) => ({
          id: a.id,
          label: a.label,
          bankName: a.bankName,
          accountNumber: a.accountNumber,
          ifscCode: a.ifscCode,
          accountType: a.accountType,
          branchName: a.branchName,
          accountHolderName: a.accountHolderName,
          upiId: a.upiId ?? '',
          isActive: a.isActive,
        }))}
        canEdit={perms.has('masters:edit')}
        canDelete={perms.has('masters:delete')}
      />
    </div>
  );
}
