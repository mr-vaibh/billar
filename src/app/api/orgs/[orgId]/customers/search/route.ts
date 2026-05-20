import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { db } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = await checkPermission(user.id, orgId, 'masters:read');
  if (denied) return denied;

  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';

  const customers = await db.customer.findMany({
    where: {
      orgId,
      isActive: true,
      ...(q ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { gstin: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
        ],
      } : {}),
    },
    orderBy: { name: 'asc' },
    take: 10,
  });

  return Response.json(customers);
}
