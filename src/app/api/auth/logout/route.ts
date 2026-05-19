import { getSessionToken, deleteSession, clearSessionCookie } from '@/lib/auth';

export async function POST() {
  const token = await getSessionToken();
  if (token) {
    await deleteSession(token);
    await clearSessionCookie();
  }
  return Response.json({ ok: true });
}
