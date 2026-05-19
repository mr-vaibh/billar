import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { db } from '@/lib/db';

type Params = { params: Promise<{ orgId: string; accountId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { orgId, accountId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = await checkPermission(user.id, orgId, 'masters:read');
  if (denied) return denied;

  const account = await db.financialAccount.findUnique({
    where: { id: accountId },
    include: { company: { select: { id: true, name: true } } },
  });
  if (!account || account.orgId !== orgId) return Response.json({ error: 'Not found' }, { status: 404 });

  return Response.json(account);
}

const patchSchema = z.object({
  companyId: z.string().optional().nullable(),
  label: z.string().min(1).max(100).optional(),
  bankName: z.string().min(1).max(100).optional(),
  accountNumber: z.string().min(1).max(30).optional(),
  ifscCode: z.string().min(1).max(15).optional(),
  accountType: z.enum(['savings', 'current', 'cc', 'od']).optional(),
  branchName: z.string().min(1).max(100).optional(),
  accountHolderName: z.string().min(1).max(200).optional(),
  upiId: z.string().max(100).optional().nullable(),
  qrCodeBase64: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  const { orgId, accountId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = await checkPermission(user.id, orgId, 'masters:edit');
  if (denied) return denied;

  const account = await db.financialAccount.findUnique({ where: { id: accountId } });
  if (!account || account.orgId !== orgId) return Response.json({ error: 'Not found' }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  if (parsed.data.companyId) {
    const company = await db.company.findUnique({ where: { id: parsed.data.companyId } });
    if (!company || company.orgId !== orgId) {
      return Response.json({ error: 'Company not found' }, { status: 404 });
    }
  }

  const updated = await db.financialAccount.update({
    where: { id: accountId },
    data: parsed.data,
  });

  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { orgId, accountId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = await checkPermission(user.id, orgId, 'masters:delete');
  if (denied) return denied;

  const account = await db.financialAccount.findUnique({ where: { id: accountId } });
  if (!account || account.orgId !== orgId) return Response.json({ error: 'Not found' }, { status: 404 });

  await db.financialAccount.update({ where: { id: accountId }, data: { isActive: false } });

  return Response.json({ ok: true });
}
