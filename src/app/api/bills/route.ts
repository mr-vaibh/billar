import { NextRequest, NextResponse } from 'next/server';
import { listBills, writeBill } from '@/lib/fileStorage';
import type { Bill } from '@/types/bill';

export async function GET() {
  try {
    const metas = listBills();
    return NextResponse.json(metas);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to list bills' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const bill: Bill = await req.json();
    if (!bill.meta?.id) {
      return NextResponse.json({ error: 'Invalid bill' }, { status: 400 });
    }
    bill.meta.updatedAt = new Date().toISOString();
    writeBill(bill);
    return NextResponse.json(bill, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create bill' }, { status: 500 });
  }
}
