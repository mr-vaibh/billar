import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/email';
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';

const schema = z.object({ email: z.string().email() });

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const rl = checkRateLimit({ key: `forgot:${ip}`, limit: 5 });
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ ok: true }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ ok: true }); // don't leak info

  const { email } = parsed.data;
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });

  // Always return ok to prevent email enumeration
  if (!user) return Response.json({ ok: true });

  // Invalidate any existing tokens
  await db.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.passwordResetToken.create({
    data: { token, userId: user.id, expiresAt },
  });

  await sendPasswordResetEmail({ to: user.email, name: user.name, token });

  return Response.json({ ok: true });
}
