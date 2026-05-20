import { getSession } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import { CustomerForm } from '@/components/customers/CustomerForm';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default async function NewCustomerPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const user = await getSession();
  if (!user) redirect('/login');

  const perms = await getPermissions(user.id, orgId);
  if (!perms.has('masters:create')) {
    return <div className="p-8 text-sm text-muted-foreground">You don't have permission to create customers.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <Link href={`/orgs/${orgId}/masters/customers`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="text-2xl font-bold">Add Customer</h1>
      </div>
      <CustomerForm orgId={orgId} />
    </div>
  );
}
