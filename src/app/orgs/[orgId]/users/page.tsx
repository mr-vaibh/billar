import { getSession } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { UsersClient } from '@/components/users/UsersClient';

export const dynamic = 'force-dynamic';

export default async function UsersPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const user = await getSession();
  if (!user) redirect('/login');

  const perms = await getPermissions(user.id, orgId);
  if (!perms.has('users:read')) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        You don't have permission to view members.
      </div>
    );
  }

  const [memberships, roles] = await Promise.all([
    db.orgMembership.findMany({
      where: { orgId },
      include: {
        user: { select: { id: true, email: true, name: true } },
        roleAssignments: {
          include: { role: { select: { id: true, name: true, isSystem: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    db.role.findMany({
      where: { orgId },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      select: { id: true, name: true, isSystem: true },
    }),
  ]);

  const members = memberships.map((m) => ({
    userId: m.user.id,
    email: m.user.email,
    name: m.user.name,
    isActive: m.isActive,
    joinedAt: m.createdAt.toISOString(),
    roles: m.roleAssignments.map((ra) => ({
      id: ra.role.id,
      name: ra.role.name,
      isSystem: ra.role.isSystem,
    })),
  }));

  return (
    <UsersClient
      orgId={orgId}
      currentUserId={user.id}
      members={members}
      allRoles={roles}
      canInvite={perms.has('users:create')}
      canEdit={perms.has('users:edit')}
      canDelete={perms.has('users:delete')}
    />
  );
}
