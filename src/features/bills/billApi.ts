import type { Bill, BillMeta } from '@/types/bill';

const BASE = '/api/bills';

export async function fetchBills(): Promise<BillMeta[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error('Failed to fetch bills');
  return res.json();
}

export async function fetchBill(id: string): Promise<Bill> {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) throw new Error('Bill not found');
  return res.json();
}

export async function saveBill(bill: Bill): Promise<Bill> {
  const res = await fetch(`${BASE}/${bill.meta.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bill),
  });
  if (!res.ok) throw new Error('Failed to save bill');
  return res.json();
}

export async function createBill(bill: Bill): Promise<Bill> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bill),
  });
  if (!res.ok) throw new Error('Failed to create bill');
  return res.json();
}

export async function deleteBill(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete bill');
}

export async function duplicateBill(id: string): Promise<Bill> {
  const res = await fetch(`${BASE}/${id}/duplicate`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to duplicate bill');
  return res.json();
}
