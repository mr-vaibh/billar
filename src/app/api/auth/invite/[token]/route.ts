import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hashPassword, createSession, setSessionCookie } from '@/lib/auth';

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;

  const invite = await db.inviteToken.findUnique({
    where: { token },
    include: { org: { select: { id: true, name: true } } },
  });

  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return Response.json({ error: 'Invite link is invalid or has expired' }, { status: 410 });
  }

  return Response.json({ email: invite.email, orgName: invite.org.name });
}

const schema = z.object({
  name: z.string().min(1).max(100),
  password: z.string().min(8),
});

export async function POST(request: NextRequest, { params }: Params) {
  const { token } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Name and a password of at least 8 characters are required' }, { status: 400 });
  }

  const invite = await db.inviteToken.findUnique({
    where: { token },
    include: { org: true },
  });

  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return Response.json({ error: 'Invite link is invalid or has expired' }, { status: 410 });
  }

  const { name, password } = parsed.data;
  const passwordHash = await hashPassword(password);

  // Create or find user, create membership, assign roles — all in one transaction
  const result = await db.$transaction(async (tx) => {
    let user = await tx.user.findUnique({ where: { email: invite.email } });

    if (!user) {
      user = await tx.user.create({
        data: { email: invite.email, name, passwordHash },
      });
    } else {
      // User exists — update name and password
      user = await tx.user.update({
        where: { id: user.id },
        data: { name, passwordHash, mustChangePassword: false },
      });
    }

    // Ensure membership
    let membership = await tx.orgMembership.findUnique({
      where: { orgId_userId: { orgId: invite.orgId, userId: user.id } },
    });
    if (!membership) {
      membership = await tx.orgMembership.create({
        data: { orgId: invite.orgId, userId: user.id },
      });
    } else {
      await tx.orgMembership.update({
        where: { id: membership.id },
        data: { isActive: true },
      });
    }

    // Assign roles from invite
    for (const roleId of invite.roleIds) {
      await tx.memberRoleAssignment.upsert({
        where: { membershipId_roleId: { membershipId: membership.id, roleId } },
        create: { membershipId: membership.id, roleId, assignedBy: invite.invitedBy },
        update: {},
      });
    }

    // Mark invite as used
    await tx.inviteToken.update({
      where: { token },
      data: { usedAt: new Date() },
    });

    return { user, orgId: invite.orgId };
  });

  const sessionToken = await createSession(result.user.id, result.orgId, request);
  await setSessionCookie(sessionToken);

  return Response.json({
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
    },
    activeOrgId: result.orgId,
  });
}
