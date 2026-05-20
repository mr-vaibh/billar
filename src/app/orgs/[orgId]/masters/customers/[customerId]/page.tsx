import { getSession } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import { db } from '@/lib/db';
import { redirect, notFound } from 'next/navigation';
import { CustomerForm } from '@/components/customers/CustomerForm';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function EditCustomerPage({ params }: { params: Promise<{ orgId: string; customerId: string }> }) {
  const { orgId, customerId } = await params;
  const user = await getSession();
  if (!user) redirect('/login');

  const perms = await getPermissions(user.id, orgId);
  if (!perms.has('masters:edit')) {
    return <div className="p-8 text-sm text-muted-foreground">You don't have permission to edit customers.</div>;
  }

  const customer = await db.customer.findUnique({ where: { id: customerId } });
  if (!customer || customer.orgId !== orgId) notFound();

  return (
    <div className="p-6 space-y-6">
      <div>
        <Link href={`/orgs/${orgId}/masters/customers`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="text-2xl font-bold">Edit Customer</h1>
      </div>
      <CustomerForm orgId={orgId} customerId={customerId} initial={{
        name: customer.name,
        gstin: customer.gstin ?? '',
        pan: customer.pan ?? '',
        address: customer.address ?? '',
        city: customer.city ?? '',
        state: customer.state ?? '',
        pincode: customer.pincode ?? '',
        phone: customer.phone ?? '',
        email: customer.email ?? '',
      }} />
    </div>
  );
}
