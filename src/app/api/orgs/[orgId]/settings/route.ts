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
  const denied = await checkPermission(user.id, orgId, 'settings:read');
  if (denied) return denied;

  const settings = await db.orgSettings.upsert({
    where: { orgId },
    create: { orgId },
    update: {},
  });

  return Response.json(settings);
}

const patchSchema = z.object({
  defaultGstMode: z.enum(['cgst_sgst', 'igst']).optional(),
  defaultIgstRate: z.number().min(0).max(100).optional(),
  defaultCgstRate: z.number().min(0).max(100).optional(),
  defaultSgstRate: z.number().min(0).max(100).optional(),
  allowCompanyOverride: z.boolean().optional(),
  allowBankOverride: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = await checkPermission(user.id, orgId, 'settings:edit');
  if (denied) return denied;

  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const settings = await db.orgSettings.upsert({
    where: { orgId },
    create: { orgId, ...parsed.data },
    update: parsed.data,
  });

  return Response.json(settings);
}
