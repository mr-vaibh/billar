import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import { RoleForm } from '@/components/roles/RoleForm';
import { ChevronLeft } from 'lucide-react';

export default async function NewRolePage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const user = await getSession();
  if (!user) redirect('/login');

  const perms = await getPermissions(user.id, orgId);
  if (!perms.has('roles:create')) redirect(`/orgs/${orgId}/roles`);

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <Link href={`/orgs/${orgId}/roles`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft className="h-4 w-4" /> Roles
        </Link>
        <h1 className="text-2xl font-bold">New role</h1>
        <p className="text-sm text-muted-foreground mt-1">Choose a name and select exactly what this role can do.</p>
      </div>
      <RoleForm orgId={orgId} />
    </div>
  );
}
