import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { db } from '@/lib/db';

type Params = { params: Promise<{ orgId: string; sequenceId: string }> };

const patchSchema = z.object({
  resetToValue: z.number().int().min(0).max(999999),
  reason: z.string().min(1).max(500),
  prefix: z.string().max(20).optional(),
  typeCode: z.string().min(1).max(10).regex(/^[A-Z0-9]+$/, 'Type code must be uppercase letters/numbers only').optional(),
  zeroPadding: z.number().int().min(1).max(8).optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  const { orgId, sequenceId } = await params;
  const user = await getSession();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = await checkPermission(user.id, orgId, 'settings:edit');
  if (denied) return denied;

  const seq = await db.invoiceSequence.findUnique({ where: { id: sequenceId } });
  if (!seq || seq.orgId !== orgId) return Response.json({ error: 'Not found' }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { resetToValue, reason, prefix, typeCode, zeroPadding } = parsed.data;

  const newPrefix = prefix ?? seq.prefix;
  const newTypeCode = typeCode ?? seq.typeCode;
  const newZeroPadding = zeroPadding ?? seq.zeroPadding;

  const updated = await db.$transaction(async (tx) => {
    await tx.invoiceSequenceHistory.create({
      data: {
        sequenceId,
        previousValue: seq.currentValue,
        newValue: resetToValue,
        previousPrefix: seq.prefix,
        newPrefix,
        previousTypeCode: seq.typeCode,
        newTypeCode,
        previousZeroPadding: seq.zeroPadding,
        newZeroPadding,
        reason,
        performedBy: user.id,
      },
    });

    return tx.invoiceSequence.update({
      where: { id: sequenceId },
      data: {
        currentValue: resetToValue,
        prefix: newPrefix,
        typeCode: newTypeCode,
        zeroPadding: newZeroPadding,
      },
      include: { history: { orderBy: { performedAt: 'desc' } } },
    });
  });

  return Response.json(updated);
}
