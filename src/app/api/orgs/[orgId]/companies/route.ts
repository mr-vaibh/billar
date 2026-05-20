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

  const companies = await db.company.findMany({
    where: { orgId },
    include: { _count: { select: { bankAccounts: { where: { isActive: true } } } } },
    orderBy: { name: 'asc' },
  });

  return Response.json(companies.map((c) => ({
    id: c.id, name: c.name, gstin: c.gstin, pan: c.pan, cin: c.cin,
    tagline: c.tagline, address: c.address, city: c.city, state: c.state,
    pincode: c.pincode, phone: c.phone, email: c.email, website: c.website,
    logoBase64: c.logoBase64, isActive: c.isActive,
    accountCount: c._count.bankAccounts,
    createdAt: c.createdAt, updatedAt: c.updatedAt,
  })));
}

const companySchema = z.object({
  name: z.string().min(1).max(200),
  gstin: z.string().max(15).optional(),
  pan: z.string().max(10).optional(),
  cin: z.string().max(21).optional(),
  tagline: z.string().max(200).optional(),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().min(1).max(10),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().max(200).optional(),
  logoBase64: z.string().optional(),
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

  const parsed = companySchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const company = await db.company.create({
    data: { orgId, ...parsed.data, email: parsed.data.email || null },
  });

  return Response.json(company, { status: 201 });
}
