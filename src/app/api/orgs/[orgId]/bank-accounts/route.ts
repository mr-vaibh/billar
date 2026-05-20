import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { db } from '@/lib/db';

type Params = { params: Promise<{ orgId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = await checkPermission(user.id, orgId, 'masters:read');
  if (denied) return denied;

  const companyId = req.nextUrl.searchParams.get('companyId');

  const accounts = await db.bankAccount.findMany({
    where: { orgId, ...(companyId ? { companyId } : {}) },
    include: { company: { select: { id: true, name: true } } },
    orderBy: { label: 'asc' },
  });

  return Response.json(accounts);
}

const accountSchema = z.object({
  companyId: z.string().optional().nullable(),
  label: z.string().min(1).max(100),
  bankName: z.string().min(1).max(100),
  accountNumber: z.string().min(1).max(30),
  ifscCode: z.string().min(1).max(15),
  accountType: z.enum(['savings', 'current', 'cc', 'od']),
  branchName: z.string().min(1).max(100),
  accountHolderName: z.string().min(1).max(200),
  upiId: z.string().max(100).optional().nullable(),
  qrCodeBase64: z.string().optional().nullable(),
});

export async function POST(request: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = await checkPermission(user.id, orgId, 'masters:create');
  if (denied) return denied;

  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = accountSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  if (parsed.data.companyId) {
    const company = await db.company.findUnique({ where: { id: parsed.data.companyId } });
    if (!company || company.orgId !== orgId) {
      return Response.json({ error: 'Company not found' }, { status: 404 });
    }
  }

  const account = await db.bankAccount.create({
    data: { orgId, ...parsed.data },
  });

  return Response.json(account, { status: 201 });
}
