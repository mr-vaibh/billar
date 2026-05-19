import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

type Params = { params: Promise<{ orgId: string }> };

function forbidden() {
  return Response.json({ error: 'Forbidden' }, { status: 403 });
}

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getSession();
  if (!user?.isSuperAdmin) return forbidden();

  const { orgId } = await params;

  const org = await db.organization.findUnique({
    where: { id: orgId },
    include: {
      _count: { select: { memberships: true, bills: true, templates: true } },
      memberships: {
        where: { isActive: true },
        include: {
          user: { select: { id: true, email: true, name: true } },
          roleAssignments: {
            include: { role: { select: { id: true, name: true } } },
          },
        },
      },
      inviteTokens: {
        where: { usedAt: null, expiresAt: { gt: new Date() } },
        select: { id: true, email: true, createdAt: true, expiresAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!org) return Response.json({ error: 'Not found' }, { status: 404 });

  return Response.json({
    id: org.id,
    name: org.name,
    slug: org.slug,
    status: org.status,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
    stats: {
      memberCount: org._count.memberships,
      billCount: org._count.bills,
      templateCount: org._count.templates,
    },
    members: org.memberships.map((m) => ({
      userId: m.user.id,
      email: m.user.email,
      name: m.user.name,
      roles: m.roleAssignments.map((ra) => ra.role.name),
      joinedAt: m.createdAt,
    })),
    pendingInvites: org.inviteTokens,
  });
}

const patchSchema = z.object({
  status: z.enum(['active', 'suspended']),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getSession();
  if (!user?.isSuperAdmin) return forbidden();

  const { orgId } = await params;

  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'status must be "active" or "suspended"' }, { status: 400 });
  }

  const org = await db.organization.update({
    where: { id: orgId },
    data: { status: parsed.data.status },
    select: { id: true, name: true, status: true },
  });

  return Response.json(org);
}
