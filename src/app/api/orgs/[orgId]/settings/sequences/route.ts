import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { db } from '@/lib/db';

type Params = { params: Promise<{ orgId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = await checkPermission(user.id, orgId, 'settings:read');
  if (denied) return denied;

  const sequences = await db.invoiceSequence.findMany({
    where: { orgId },
    orderBy: [{ billType: 'asc' }, { financialYear: 'desc' }],
    include: { history: { orderBy: { performedAt: 'desc' }, take: 5 } },
  });

  return Response.json(sequences);
}
