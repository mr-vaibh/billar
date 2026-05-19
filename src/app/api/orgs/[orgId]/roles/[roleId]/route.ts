import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { checkPermission, ALL_PERMISSIONS } from '@/lib/permissions';
import { db } from '@/lib/db';

type Params = { params: Promise<{ orgId: string; roleId: string }> };

const LOCKED_SYSTEM_ROLES = ['Owner', 'Admin']; // permissions cannot be changed

const patchSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  description: z.string().max(200).optional(),
  permissions: z.array(z.string()).optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  const { orgId, roleId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const denied = await checkPermission(user.id, orgId, 'roles:edit');
  if (denied) return denied;

  const role = await db.role.findUnique({
    where: { id: roleId },
    include: { rolePermissions: true },
  });
  if (!role || role.orgId !== orgId) {
    return Response.json({ error: 'Role not found' }, { status: 404 });
  }
  if (LOCKED_SYSTEM_ROLES.includes(role.name)) {
    return Response.json({ error: `The ${role.name} role cannot be modified` }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 });

  const { name, description, permissions } = parsed.data;

  if (permissions) {
    const invalid = permissions.filter((p) => !ALL_PERMISSIONS.includes(p as never));
    if (invalid.length) {
      return Response.json({ error: `Unknown permissions: ${invalid.join(', ')}` }, { status: 400 });
    }
  }

  if (name && name !== role.name) {
    const existing = await db.role.findUnique({ where: { orgId_name: { orgId, name } } });
    if (existing) return Response.json({ error: 'A role with this name already exists' }, { status: 409 });
  }

  await db.$transaction(async (tx) => {
    await tx.role.update({
      where: { id: roleId },
      data: {
        name: name ?? role.name,
        description: description ?? role.description,
      },
    });

    if (permissions !== undefined) {
      await tx.rolePermission.deleteMany({ where: { roleId } });
      if (permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((p) => ({ roleId, permission: p })),
        });
      }
    }
  });

  return Response.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { orgId, roleId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const denied = await checkPermission(user.id, orgId, 'roles:delete');
  if (denied) return denied;

  const role = await db.role.findUnique({ where: { id: roleId } });
  if (!role || role.orgId !== orgId) {
    return Response.json({ error: 'Role not found' }, { status: 404 });
  }
  if (role.isSystem) {
    return Response.json({ error: 'System roles cannot be deleted' }, { status: 403 });
  }

  await db.role.delete({ where: { id: roleId } });

  return Response.json({ ok: true });
}
