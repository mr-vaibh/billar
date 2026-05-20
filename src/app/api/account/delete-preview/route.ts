import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const membership = await db.orgMembership.findFirst({
    where: { userId: user.id, isActive: true },
    include: {
      org: { select: { id: true, name: true } },
      roleAssignments: {
        include: { role: { include: { rolePermissions: true } } },
      },
    },
  });

  if (!membership) return Response.json({ willDeleteOrg: false });

  const memberCount = await db.orgMembership.count({ where: { orgId: membership.orgId, isActive: true } });

  if (memberCount > 1) {
    // Other members exist — org survives, no special warning needed
    return Response.json({ willDeleteOrg: false });
  }

  // User is the last member — org will be deleted
  const perms = new Set(
    membership.roleAssignments.flatMap((ra) =>
      ra.role.rolePermissions.map((rp) => rp.permission)
    )
  );

  return Response.json({
    willDeleteOrg: true,
    orgName: membership.org.name,
    canDelete: perms.has('org:delete'),
  });
}
