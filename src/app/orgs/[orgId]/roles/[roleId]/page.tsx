import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import { db } from '@/lib/db';
import { RoleForm } from '@/components/roles/RoleForm';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Lock } from 'lucide-react';

const LOCKED_SYSTEM_ROLES = ['Owner', 'Admin'];

export default async function RoleDetailPage({ params }: { params: Promise<{ orgId: string; roleId: string }> }) {
  const { orgId, roleId } = await params;
  const user = await getSession();
  if (!user) redirect('/login');

  const perms = await getPermissions(user.id, orgId);
  if (!perms.has('roles:read')) redirect(`/orgs/${orgId}/bills`);

  const role = await db.role.findUnique({
    where: { id: roleId },
    include: { rolePermissions: { select: { permission: true } } },
  });
  if (!role || role.orgId !== orgId) notFound();

  const isLocked = LOCKED_SYSTEM_ROLES.includes(role.name);
  const canEdit = perms.has('roles:edit') && !isLocked;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <Link href={`/orgs/${orgId}/roles`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft className="h-4 w-4" /> Roles
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{role.name}</h1>
          {role.isSystem && <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" />System</Badge>}
        </div>
        {isLocked && (
          <p className="text-sm text-muted-foreground mt-1">
            This system role cannot be modified to ensure at least one fully-privileged role always exists.
          </p>
        )}
        {role.isSystem && !isLocked && (
          <p className="text-sm text-muted-foreground mt-1">
            System role — permissions can be adjusted but the role cannot be deleted.
          </p>
        )}
      </div>

      <RoleForm
        orgId={orgId}
        roleId={roleId}
        initial={{
          name: role.name,
          description: role.description ?? '',
          permissions: role.rolePermissions.map((rp) => rp.permission),
        }}
        readOnly={!canEdit}
      />
    </div>
  );
}
