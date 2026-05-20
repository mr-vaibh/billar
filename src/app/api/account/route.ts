import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSession, hashPassword, verifyPassword, clearSessionCookie } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return Response.json({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt });
}

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
});

export async function PATCH(req: NextRequest) {
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { name, currentPassword, newPassword } = parsed.data;

  if (newPassword) {
    if (!currentPassword) return Response.json({ error: 'Current password required' }, { status: 400 });
    const dbUser = await db.user.findUnique({ where: { id: user.id } });
    if (!dbUser) return Response.json({ error: 'User not found' }, { status: 404 });
    const ok = await verifyPassword(currentPassword, dbUser.passwordHash);
    if (!ok) return Response.json({ error: 'Current password is incorrect' }, { status: 400 });
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      ...(name ? { name } : {}),
      ...(newPassword ? { passwordHash: await hashPassword(newPassword) } : {}),
    },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  return Response.json(updated);
}

export async function DELETE() {
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Find the user's org membership (one org per user)
  const membership = await db.orgMembership.findFirst({
    where: { userId: user.id, isActive: true },
    include: {
      roleAssignments: {
        include: { role: { include: { rolePermissions: true } } },
      },
    },
  });

  if (membership) {
    const orgId = membership.orgId;
    const memberCount = await db.orgMembership.count({ where: { orgId, isActive: true } });

    if (memberCount === 1) {
      // User is the last member — org must be deleted too, requires org:delete permission
      const perms = new Set(
        membership.roleAssignments.flatMap((ra) =>
          ra.role.rolePermissions.map((rp) => rp.permission)
        )
      );
      if (!perms.has('org:delete')) {
        return Response.json(
          { error: 'You are the only member of this organization. Deleting your account would delete the organization, which requires the org:delete permission.' },
          { status: 403 }
        );
      }
      await db.organization.update({ where: { id: orgId }, data: { status: 'deleted' } });
    }
    // If other members exist, the org stays — just remove the user's membership
  }

  await db.session.deleteMany({ where: { userId: user.id } });
  await db.orgMembership.updateMany({ where: { userId: user.id }, data: { isActive: false } });
  await db.user.delete({ where: { id: user.id } });

  await clearSessionCookie();
  return Response.json({ ok: true });
}
