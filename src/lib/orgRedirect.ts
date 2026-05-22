import { redirect } from 'next/navigation';
import { getSession, getSessionToken } from './auth';
import { db } from './db';

/**
 * Call at the top of standalone page server components.
 * - Authenticated users with an org → redirected to /orgs/[orgId]${orgPath}
 * - Stale cookie (no DB session) → redirected to /login
 * - DB unavailable or migrations not run → falls through silently
 */
export async function redirectIfOrg(orgPath: string) {
  const token = await getSessionToken();
  if (!token) return;

  let user: Awaited<ReturnType<typeof getSession>>;
  try {
    user = await getSession();
  } catch {
    return; // DB unavailable — show standalone page
  }

  if (!user) {
    redirect('/login');
  }

  let orgId: string | null | undefined = user.activeOrgId;
  if (!orgId) {
    try {
      orgId = (await db.orgMembership.findFirst({
        where: { userId: user.id, isActive: true, org: { status: 'active' } },
        select: { orgId: true },
      }))?.orgId;
    } catch {
      return; // DB unavailable — fall through
    }
  }

  if (orgId) redirect(`/orgs/${orgId}${orgPath}`);
}
