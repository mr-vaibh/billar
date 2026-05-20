import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { db } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import { sendInvoiceEmail } from '@/lib/email';
import { writeAuditLog } from '@/lib/audit';

type Params = { params: Promise<{ orgId: string; billId: string }> };
const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

const bodySchema = z.object({ to: z.string().email() });

export async function POST(request: NextRequest, { params }: Params) {
  const { orgId, billId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = await checkPermission(user.id, orgId, 'bills:edit');
  if (denied) return denied;

  const bill = await db.bill.findUnique({ where: { id: billId }, include: { org: { select: { name: true } } } });
  if (!bill || bill.orgId !== orgId) return Response.json({ error: 'Not found' }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  // Ensure share token exists
  const token = bill.shareToken ?? generateToken();
  if (!bill.shareToken) {
    await db.bill.update({
      where: { id: billId },
      data: { shareToken: token, shareTokenCreatedAt: new Date(), updatedBy: user.id },
    });
  }
  const shareUrl = `${APP_URL}/share/${token}`;

  // Mark as sent if currently finalized
  if (bill.status === 'finalized') {
    await db.bill.update({ where: { id: billId }, data: { status: 'sent', updatedBy: user.id } });
  }

  await sendInvoiceEmail({
    to: parsed.data.to,
    orgName: bill.org.name,
    billNumber: bill.billNumber,
    shareUrl,
  });

  await writeAuditLog({ orgId, userId: user.id, action: 'bill:email_sent', resourceId: billId, meta: { to: parsed.data.to } });

  return Response.json({ ok: true, shareUrl });
}
