import { NextRequest, NextResponse } from 'next/server';
import { readBill, writeBill } from '@/lib/fileStorage';
import { generateId } from '@/lib/idGenerator';

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const original = readBill(id);
  if (!original) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const now = new Date().toISOString();
  const newId = generateId();

  const duplicate = {
    ...original,
    meta: {
      ...original.meta,
      id: newId,
      billNumber: original.meta.billNumber + ' (Copy)',
      status: 'draft' as const,
      duplicatedFromId: id,
      createdAt: now,
      updatedAt: now,
    },
  };

  writeBill(duplicate);
  return NextResponse.json(duplicate, { status: 201 });
}
