import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { db } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import { sendInviteEmail } from '@/lib/email';

type Params = { params: Promise<{ orgId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const denied = await checkPermission(user.id, orgId, 'users:read');
  if (denied) return denied;

  const memberships = await db.orgMembership.findMany({
    where: { orgId },
    include: {
      user: { select: { id: true, email: true, name: true, createdAt: true } },
      roleAssignments: {
        include: { role: { select: { id: true, name: true, isSystem: true } } },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return Response.json(
    memberships.map((m) => ({
      userId: m.user.id,
      email: m.user.email,
      name: m.user.name,
      isActive: m.isActive,
      joinedAt: m.createdAt,
      roles: m.roleAssignments.map((ra) => ({
        id: ra.role.id,
        name: ra.role.name,
        isSystem: ra.role.isSystem,
      })),
    }))
  );
}

const inviteSchema = z.object({
  email: z.string().email(),
  roleIds: z.array(z.string()).min(1, 'Select at least one role'),
});

export async function POST(request: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const denied = await checkPermission(user.id, orgId, 'users:create');
  if (denied) return denied;

  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { email, roleIds } = parsed.data;

  // Validate roles belong to this org
  const roles = await db.role.findMany({
    where: { id: { in: roleIds }, orgId },
    select: { id: true },
  });
  if (roles.length !== roleIds.length) {
    return Response.json({ error: 'One or more roles are invalid' }, { status: 400 });
  }

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { name: true },
  });
  if (!org) return Response.json({ error: 'Organisation not found' }, { status: 404 });

  // Create or refresh invite token
  await db.inviteToken.deleteMany({
    where: { email: email.toLowerCase(), orgId, usedAt: null },
  });

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

  await db.inviteToken.create({
    data: {
      token,
      email: email.toLowerCase(),
      orgId,
      roleIds,
      invitedBy: user.id,
      expiresAt,
    },
  });

  await sendInviteEmail({
    to: email,
    orgName: org.name,
    inviterName: user.name,
    token,
  });

  return Response.json({ ok: true }, { status: 201 });
}
