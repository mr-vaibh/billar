import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { db } from '@/lib/db';
import { generateToken } from '@/lib/auth';

type Params = { params: Promise<{ orgId: string; billId: string }> };
const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

export async function GET(_req: NextRequest, { params }: Params) {
  const { orgId, billId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = await checkPermission(user.id, orgId, 'bills:read');
  if (denied) return denied;

  const bill = await db.bill.findUnique({ where: { id: billId }, select: { orgId: true, shareToken: true } });
  if (!bill || bill.orgId !== orgId) return Response.json({ error: 'Not found' }, { status: 404 });

  const shareUrl = bill.shareToken ? `${APP_URL}/share/${bill.shareToken}` : null;
  return Response.json({ shareUrl });
}

export async function POST(_req: NextRequest, { params }: Params) {
  const { orgId, billId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = await checkPermission(user.id, orgId, 'bills:edit');
  if (denied) return denied;

  const bill = await db.bill.findUnique({ where: { id: billId } });
  if (!bill || bill.orgId !== orgId) return Response.json({ error: 'Not found' }, { status: 404 });

  const token = bill.shareToken ?? generateToken();
  if (!bill.shareToken) {
    await db.bill.update({
      where: { id: billId },
      data: { shareToken: token, shareTokenCreatedAt: new Date(), updatedBy: user.id },
    });
  }

  return Response.json({ shareUrl: `${APP_URL}/share/${token}` });
}
