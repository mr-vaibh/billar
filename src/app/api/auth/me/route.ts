import { getSession, getUserOrgs } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';

export async function GET() {
  const user = await getSession();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orgs = await getUserOrgs(user.id);
  const permissions = user.activeOrgId
    ? [...(await getPermissions(user.id, user.activeOrgId))]
    : [];

  return Response.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      isSuperAdmin: user.isSuperAdmin,
      mustChangePassword: user.mustChangePassword,
    },
    activeOrgId: user.activeOrgId,
    orgs: orgs.map((o) => ({ id: o.id, name: o.name, slug: o.slug })),
    permissions,
  });
}
