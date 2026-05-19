import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { createOrgWithRoles } from '@/lib/orgSetup';

function forbidden() {
  return Response.json({ error: 'Forbidden' }, { status: 403 });
}

export async function GET() {
  const user = await getSession();
  if (!user?.isSuperAdmin) return forbidden();

  const orgs = await db.organization.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { memberships: true, bills: true } },
    },
  });

  return Response.json(
    orgs.map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      status: o.status,
      memberCount: o._count.memberships,
      billCount: o._count.bills,
      createdAt: o.createdAt,
    }))
  );
}

const schema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  ownerEmail: z.string().email(),
});

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user?.isSuperAdmin) return forbidden();

  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { name, slug, ownerEmail } = parsed.data;

  const existing = await db.organization.findUnique({ where: { slug } });
  if (existing) {
    return Response.json({ error: 'An organisation with this slug already exists' }, { status: 409 });
  }

  try {
    const { org } = await createOrgWithRoles({
      name,
      slug,
      ownerEmail,
      invitedByUserId: user.id,
      inviterName: user.name,
    });

    return Response.json({ id: org.id, name: org.name, slug: org.slug }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create organisation';
    return Response.json({ error: message }, { status: 500 });
  }
}
