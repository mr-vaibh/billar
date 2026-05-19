import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { db } from '@/lib/db';
import type { BillType } from '@/types/bill';

type Params = { params: Promise<{ orgId: string; templateId: string }> };

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
  const { orgId, templateId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = await checkPermission(user.id, orgId, 'templates:read');
  if (denied) return denied;

  const template = await db.template.findUnique({ where: { id: templateId } });
  if (!template || template.orgId !== orgId) return Response.json({ error: 'Not found' }, { status: 404 });

  return Response.json(dbTemplateToClient(template));
}

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional().nullable(),
  blocksJson: z.array(z.unknown()).optional(),
  globalCanvasJson: z.unknown().optional().nullable(),
  tags: z.array(z.string()).optional(),
  isDefault: z.boolean().optional(),
});

export async function PUT(request: NextRequest, { params }: Params) {
  const { orgId, templateId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = await checkPermission(user.id, orgId, 'templates:edit');
  if (denied) return denied;

  const template = await db.template.findUnique({ where: { id: templateId } });
  if (!template || template.orgId !== orgId) return Response.json({ error: 'Not found' }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { blocksJson, globalCanvasJson, ...rest } = parsed.data;
  const updated = await db.template.update({
    where: { id: templateId },
    data: {
      ...rest,
      ...(blocksJson !== undefined ? { blocksJson: blocksJson as never } : {}),
      ...(globalCanvasJson !== undefined ? { globalCanvasJson: (globalCanvasJson ?? undefined) as never } : {}),
      updatedBy: user.id,
    },
  });

  return Response.json(dbTemplateToClient(updated));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { orgId, templateId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = await checkPermission(user.id, orgId, 'templates:delete');
  if (denied) return denied;

  const template = await db.template.findUnique({ where: { id: templateId } });
  if (!template || template.orgId !== orgId) return Response.json({ error: 'Not found' }, { status: 404 });

  await db.template.delete({ where: { id: templateId } });

  return Response.json({ ok: true });
}
