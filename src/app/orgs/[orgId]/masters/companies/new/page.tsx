import { getSession } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { CompanyForm } from '@/components/companies/CompanyForm';

export default async function NewCompanyPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const user = await getSession();
  if (!user) redirect('/login');

  const perms = await getPermissions(user.id, orgId);
  if (!perms.has('masters:create')) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        You don't have permission to create companies.
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div className="space-y-1">
        <Link href={`/orgs/${orgId}/masters/companies`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
          <ChevronLeft className="h-4 w-4" />
          Back to Companies
        </Link>
        <h1 className="text-2xl font-bold">Add Company</h1>
      </div>
      <CompanyForm orgId={orgId} />
    </div>
  );
}
