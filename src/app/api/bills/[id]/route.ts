import { NextRequest, NextResponse } from 'next/server';
import { readBill, writeBill, deleteBill } from '@/lib/fileStorage';
import type { Bill } from '@/types/bill';
import { generateId } from '@/lib/idGenerator';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bill = readBill(id);
  if (!bill) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(bill);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const bill: Bill = await req.json();
    if (bill.meta.id !== id) {
      return NextResponse.json({ error: 'ID mismatch' }, { status: 400 });
    }
    bill.meta.updatedAt = new Date().toISOString();
    writeBill(bill);
    return NextResponse.json(bill);
  } catch {
    return NextResponse.json({ error: 'Failed to save bill' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = deleteBill(id);
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
