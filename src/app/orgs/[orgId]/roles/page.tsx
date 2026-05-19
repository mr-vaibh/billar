import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import { db } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DeleteRoleButton } from '@/components/roles/DeleteRoleButton';
import { PlusCircle, Lock, Shield } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function RolesPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const user = await getSession();
  if (!user) redirect('/login');

  const perms = await getPermissions(user.id, orgId);
  if (!perms.has('roles:read')) {
    return <div className="p-8 text-sm text-muted-foreground">You don't have permission to view roles.</div>;
  }

  const roles = await db.role.findMany({
    where: { orgId },
    include: { rolePermissions: { select: { permission: true } } },
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  });

  const canCreate = perms.has('roles:create');
  const canEdit = perms.has('roles:edit');
  const canDelete = perms.has('roles:delete');

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Roles</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{roles.length} roles</p>
        </div>
        {canCreate && (
          <Link href={`/orgs/${orgId}/roles/new`}>
            <Button className="gap-2">
              <PlusCircle className="h-4 w-4" /> New role
            </Button>
          </Link>
        )}
      </div>

      <div className="border rounded-xl overflow-hidden bg-background divide-y">
        {roles.map((role) => (
          <div key={role.id} className="flex items-center gap-4 px-4 py-4 hover:bg-muted/20 transition-colors">
            <div className="shrink-0">
              {role.isSystem
                ? <Lock className="h-4 w-4 text-muted-foreground" />
                : <Shield className="h-4 w-4 text-muted-foreground" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{role.name}</span>
                {role.isSystem && <Badge variant="outline" className="text-xs">System</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {role.rolePermissions.length} permission{role.rolePermissions.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {(canEdit || role.isSystem) && (
                <Link href={`/orgs/${orgId}/roles/${role.id}`}>
                  <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
                    {role.isSystem ? 'View' : 'Edit'}
                  </Button>
                </Link>
              )}
              {canDelete && !role.isSystem && (
                <DeleteRoleButton orgId={orgId} roleId={role.id} roleName={role.name} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
