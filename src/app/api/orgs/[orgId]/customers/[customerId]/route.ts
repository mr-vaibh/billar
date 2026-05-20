import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { db } from '@/lib/db';

type Params = { params: Promise<{ orgId: string; customerId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { orgId, customerId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = await checkPermission(user.id, orgId, 'masters:read');
  if (denied) return denied;

  const customer = await db.customer.findUnique({ where: { id: customerId } });
  if (!customer || customer.orgId !== orgId) return Response.json({ error: 'Not found' }, { status: 404 });

  return Response.json(customer);
}

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  gstin: z.string().max(15).optional().nullable(),
  pan: z.string().max(10).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  pincode: z.string().max(10).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  const { orgId, customerId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = await checkPermission(user.id, orgId, 'masters:edit');
  if (denied) return denied;

  const customer = await db.customer.findUnique({ where: { id: customerId } });
  if (!customer || customer.orgId !== orgId) return Response.json({ error: 'Not found' }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const updated = await db.customer.update({
    where: { id: customerId },
    data: { ...parsed.data, email: parsed.data.email === '' ? null : parsed.data.email },
  });

  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { orgId, customerId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = await checkPermission(user.id, orgId, 'masters:delete');
  if (denied) return denied;

  const customer = await db.customer.findUnique({ where: { id: customerId } });
  if (!customer || customer.orgId !== orgId) return Response.json({ error: 'Not found' }, { status: 404 });

  await db.customer.update({ where: { id: customerId }, data: { isActive: false } });

  return Response.json({ ok: true });
}
