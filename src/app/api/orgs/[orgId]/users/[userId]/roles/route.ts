import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { db } from '@/lib/db';

type Params = { params: Promise<{ orgId: string; userId: string }> };

const schema = z.object({ roleIds: z.array(z.string()).min(1) });

export async function PUT(request: NextRequest, { params }: Params) {
  const { orgId, userId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const denied = await checkPermission(user.id, orgId, 'users:edit');
  if (denied) return denied;

  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'roleIds required' }, { status: 400 });

  const { roleIds } = parsed.data;

  const roles = await db.role.findMany({ where: { id: { in: roleIds }, orgId } });
  if (roles.length !== roleIds.length) {
    return Response.json({ error: 'One or more roles are invalid' }, { status: 400 });
  }

  const membership = await db.orgMembership.findUnique({
    where: { orgId_userId: { orgId, userId } },
  });
  if (!membership) return Response.json({ error: 'Member not found' }, { status: 404 });

  // Replace all role assignments
  await db.$transaction([
    db.memberRoleAssignment.deleteMany({ where: { membershipId: membership.id } }),
    db.memberRoleAssignment.createMany({
      data: roleIds.map((roleId) => ({
        membershipId: membership.id,
        roleId,
        assignedBy: user.id,
      })),
    }),
  ]);

  return Response.json({ ok: true });
}
