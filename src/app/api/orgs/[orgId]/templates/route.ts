import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { db } from '@/lib/db';
import type { BillType } from '@/types/bill';

type Params = { params: Promise<{ orgId: string }> };

function dbTemplateToClient(t: { id: string; name: string; description: string | null; thumbnail: string | null; billType: string; blocksJson: unknown; globalCanvasJson: unknown; isDefault: boolean; tags: string[]; createdAt: Date; updatedAt: Date }) {
  return {
    id: t.id,
    name: t.name,
    description: t.description ?? undefined,
    thumbnail: t.thumbnail ?? undefined,
    billType: t.billType as BillType,
    blocks: t.blocksJson,
    globalCanvasOverlay: t.globalCanvasJson ?? undefined,
    isDefault: t.isDefault,
    tags: t.tags,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = await checkPermission(user.id, orgId, 'templates:read');
  if (denied) return denied;

  const templates = await db.template.findMany({
    where: { orgId },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });

  return Response.json(templates.map(dbTemplateToClient));
}

const templateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional().nullable(),
  billType: z.enum(['invoice', 'proforma', 'credit_note', 'debit_note', 'delivery_challan', 'purchase_order', 'quotation']),
  blocksJson: z.array(z.unknown()),
  globalCanvasJson: z.unknown().optional().nullable(),
  tags: z.array(z.string()).default([]),
  isDefault: z.boolean().default(false),
});

export async function POST(request: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = await checkPermission(user.id, orgId, 'templates:create');
  if (denied) return denied;

  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = templateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const template = await db.template.create({
    data: {
      orgId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      billType: parsed.data.billType,
      blocksJson: parsed.data.blocksJson as never,
      globalCanvasJson: (parsed.data.globalCanvasJson ?? undefined) as never,
      tags: parsed.data.tags,
      isDefault: parsed.data.isDefault,
      createdBy: user.id,
      updatedBy: user.id,
    },
  });

  return Response.json(dbTemplateToClient(template), { status: 201 });
}
