import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { db } from '@/lib/db';

type Params = { params: Promise<{ orgId: string; companyId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { orgId, companyId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = await checkPermission(user.id, orgId, 'masters:read');
  if (denied) return denied;

  const company = await db.company.findUnique({
    where: { id: companyId },
    include: {
      financialAccounts: {
        where: { isActive: true },
        orderBy: { label: 'asc' },
      },
    },
  });
  if (!company || company.orgId !== orgId) return Response.json({ error: 'Not found' }, { status: 404 });

  return Response.json(company);
}

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  gstin: z.string().max(15).optional(),
  pan: z.string().max(10).optional(),
  cin: z.string().max(21).optional(),
  tagline: z.string().max(200).optional(),
  address: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  pincode: z.string().max(10).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().max(200).optional(),
  logoBase64: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  const { orgId, companyId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = await checkPermission(user.id, orgId, 'masters:edit');
  if (denied) return denied;

  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company || company.orgId !== orgId) return Response.json({ error: 'Not found' }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const updated = await db.company.update({
    where: { id: companyId },
    data: { ...parsed.data, email: parsed.data.email === '' ? null : parsed.data.email },
  });

  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { orgId, companyId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = await checkPermission(user.id, orgId, 'masters:delete');
  if (denied) return denied;

  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company || company.orgId !== orgId) return Response.json({ error: 'Not found' }, { status: 404 });

  // Soft delete
  await db.company.update({ where: { id: companyId }, data: { isActive: false } });

  return Response.json({ ok: true });
}
