import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { db } from '@/lib/db';

type Params = { params: Promise<{ orgId: string; userId: string }> };

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  name: z.string().min(1).optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  const { orgId, userId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const denied = await checkPermission(user.id, orgId, 'users:edit');
  if (denied) return denied;

  if (userId === user.id) {
    return Response.json({ error: 'Cannot modify your own membership' }, { status: 400 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 });

  const membership = await db.orgMembership.findUnique({
    where: { orgId_userId: { orgId, userId } },
  });
  if (!membership) return Response.json({ error: 'Member not found' }, { status: 404 });

  await db.orgMembership.update({
    where: { id: membership.id },
    data: { isActive: parsed.data.isActive ?? membership.isActive },
  });

  if (parsed.data.name) {
    await db.user.update({ where: { id: userId }, data: { name: parsed.data.name } });
  }

  return Response.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { orgId, userId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const denied = await checkPermission(user.id, orgId, 'users:delete');
  if (denied) return denied;

  if (userId === user.id) {
    return Response.json({ error: 'Cannot remove yourself from the organisation' }, { status: 400 });
  }

  const membership = await db.orgMembership.findUnique({
    where: { orgId_userId: { orgId, userId } },
  });
  if (!membership) return Response.json({ error: 'Member not found' }, { status: 404 });

  await db.orgMembership.delete({ where: { id: membership.id } });

  return Response.json({ ok: true });
}
