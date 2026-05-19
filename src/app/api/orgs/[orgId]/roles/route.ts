import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { checkPermission, ALL_PERMISSIONS } from '@/lib/permissions';
import { db } from '@/lib/db';

type Params = { params: Promise<{ orgId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const denied = await checkPermission(user.id, orgId, 'roles:read');
  if (denied) return denied;

  const roles = await db.role.findMany({
    where: { orgId },
    include: { rolePermissions: { select: { permission: true } } },
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  });

  return Response.json(
    roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      permissions: r.rolePermissions.map((rp) => rp.permission),
    }))
  );
}

const createSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(200).optional(),
  permissions: z.array(z.string()).default([]),
});

export async function POST(request: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const denied = await checkPermission(user.id, orgId, 'roles:create');
  if (denied) return denied;

  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { name, description, permissions } = parsed.data;

  // Validate permissions are canonical
  const invalid = permissions.filter((p) => !ALL_PERMISSIONS.includes(p as never));
  if (invalid.length) {
    return Response.json({ error: `Unknown permissions: ${invalid.join(', ')}` }, { status: 400 });
  }

  const existing = await db.role.findUnique({ where: { orgId_name: { orgId, name } } });
  if (existing) {
    return Response.json({ error: 'A role with this name already exists' }, { status: 409 });
  }

  const role = await db.role.create({
    data: {
      orgId,
      name,
      description,
      isSystem: false,
      rolePermissions: { create: permissions.map((p) => ({ permission: p })) },
    },
    include: { rolePermissions: { select: { permission: true } } },
  });

  return Response.json({
    id: role.id,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    permissions: role.rolePermissions.map((rp) => rp.permission),
  }, { status: 201 });
}
