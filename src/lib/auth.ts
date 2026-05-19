import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from './db';
import type { User, Organization } from '@prisma/client';

const SESSION_COOKIE = 'billar_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const RENEW_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // renew if < 7 days left

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string, orgId: string | null, request?: Request) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.session.create({
    data: {
      userId,
      orgId,
      token,
      expiresAt,
      ipAddress: request ? getClientIp(request) : null,
      userAgent: request ? request.headers.get('user-agent') : null,
    },
  });

  return token;
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

export type SessionUser = User & { activeOrgId: string | null };

export async function getSession(): Promise<SessionUser | null> {
  const token = await getSessionToken();
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) await db.session.delete({ where: { token } });
    return null;
  }

  // Sliding expiry: renew if less than 7 days remain
  const remaining = session.expiresAt.getTime() - Date.now();
  if (remaining < RENEW_THRESHOLD_MS) {
    await db.session.update({
      where: { token },
      data: { expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
    });
  }

  return { ...session.user, activeOrgId: session.orgId };
}

export async function deleteSession(token: string) {
  await db.session.deleteMany({ where: { token } });
}

export async function getUserOrgs(userId: string): Promise<Organization[]> {
  const memberships = await db.orgMembership.findMany({
    where: { userId, isActive: true, org: { status: 'active' } },
    include: { org: true },
  });
  return memberships.map((m) => m.org);
}

function getClientIp(request: Request): string | null {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    null
  );
}
