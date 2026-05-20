import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { db } from '@/lib/db';

type Params = { params: Promise<{ orgId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = await checkPermission(user.id, orgId, 'masters:read');
  if (denied) return denied;

  const customers = await db.customer.findMany({
    where: { orgId },
    orderBy: { name: 'asc' },
  });

  return Response.json(customers);
}

const customerSchema = z.object({
  name: z.string().min(1).max(200),
  gstin: z.string().max(15).nullish(),
  pan: z.string().max(10).nullish(),
  address: z.string().max(500).nullish(),
  city: z.string().max(100).nullish(),
  state: z.string().max(100).nullish(),
  pincode: z.string().max(10).nullish(),
  phone: z.string().max(20).nullish(),
  email: z.string().email().nullish().or(z.literal('')),
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

  const parsed = customerSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { email, gstin, pan, address, city, state, pincode, phone } = parsed.data;
  const customer = await db.customer.create({
    data: {
      orgId,
      name: parsed.data.name,
      gstin: gstin || null,
      pan: pan || null,
      address: address || null,
      city: city || null,
      state: state || null,
      pincode: pincode || null,
      phone: phone || null,
      email: email || null,
    },
  });

  return Response.json(customer, { status: 201 });
}
