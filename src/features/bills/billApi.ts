import type { Bill, BillMeta } from '@/types/bill';

// ─── Legacy flat-file API (kept for backward compatibility) ───────────────────

const LEGACY_BASE = '/api/bills';

export async function fetchBills(): Promise<BillMeta[]> {
  const res = await fetch(LEGACY_BASE);
  if (!res.ok) throw new Error('Failed to fetch bills');
  return res.json();
}

export async function fetchBill(id: string): Promise<Bill> {
  const res = await fetch(`${LEGACY_BASE}/${id}`);
  if (!res.ok) throw new Error('Bill not found');
  return res.json();
}

export async function saveBill(bill: Bill): Promise<Bill> {
  const res = await fetch(`${LEGACY_BASE}/${bill.meta.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bill),
  });
  if (!res.ok) throw new Error('Failed to save bill');
  return res.json();
}

export async function createBill(bill: Bill): Promise<Bill> {
  const res = await fetch(LEGACY_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bill),
  });
  if (!res.ok) throw new Error('Failed to create bill');
  return res.json();
}

export async function deleteBill(id: string): Promise<void> {
  const res = await fetch(`${LEGACY_BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete bill');
}

export async function duplicateBill(id: string): Promise<Bill> {
  const res = await fetch(`${LEGACY_BASE}/${id}/duplicate`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to duplicate bill');
  return res.json();
}

// ─── Org-scoped DB API ────────────────────────────────────────────────────────

function orgBase(orgId: string) {
  return `/api/orgs/${orgId}/bills`;
}

export async function orgFetchBills(orgId: string): Promise<BillMeta[]> {
  const res = await fetch(orgBase(orgId));
  if (!res.ok) throw new Error('Failed to fetch bills');
  return res.json();
}

export async function orgFetchBill(orgId: string, id: string): Promise<Bill> {
  const res = await fetch(`${orgBase(orgId)}/${id}`);
  if (!res.ok) throw new Error('Bill not found');
  return res.json();
}

export async function orgSaveBill(orgId: string, bill: Bill): Promise<Bill> {
  const res = await fetch(`${orgBase(orgId)}/${bill.meta.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: bill.meta.status,
      companyId: bill.meta.companyId ?? null,
      tags: bill.meta.tags ?? [],
      blocksJson: bill.blocks,
      globalCanvasJson: bill.globalCanvasOverlay ?? null,
      schemaVersion: bill.schemaVersion,
    }),
  });
  if (!res.ok) throw new Error('Failed to save bill');
  return res.json();
}

export async function orgCreateBill(orgId: string, bill: Bill): Promise<Bill> {
  const res = await fetch(orgBase(orgId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      billType: bill.meta.billType,
      status: bill.meta.status,
      companyId: bill.meta.companyId ?? null,
      templateId: bill.meta.templateId ?? null,
      currency: bill.meta.currency,
      tags: bill.meta.tags ?? [],
      blocksJson: bill.blocks,
      globalCanvasJson: bill.globalCanvasOverlay ?? null,
      schemaVersion: bill.schemaVersion,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Failed to create bill');
  }
  return res.json();
}

export async function orgDeleteBill(orgId: string, id: string): Promise<void> {
  const res = await fetch(`${orgBase(orgId)}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete bill');
}

export async function orgDuplicateBill(orgId: string, id: string): Promise<Bill> {
  const res = await fetch(`${orgBase(orgId)}/${id}/duplicate`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to duplicate bill');
  return res.json();
}

// ─── Org-scoped Template API ──────────────────────────────────────────────────

function orgTemplateBase(orgId: string) {
  return `/api/orgs/${orgId}/templates`;
}

export async function orgFetchTemplates(orgId: string) {
  const res = await fetch(orgTemplateBase(orgId));
  if (!res.ok) throw new Error('Failed to fetch templates');
  return res.json();
}

export async function orgSaveTemplate(orgId: string, template: {
  id?: string; name: string; description?: string; billType: string;
  blocksJson: unknown[]; globalCanvasJson?: unknown; tags?: string[]; isDefault?: boolean;
}) {
  const isNew = !template.id;
  const url = isNew ? orgTemplateBase(orgId) : `${orgTemplateBase(orgId)}/${template.id}`;
  const method = isNew ? 'POST' : 'PUT';
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template),
  });
  if (!res.ok) throw new Error('Failed to save template');
  return res.json();
}

export async function orgDeleteTemplate(orgId: string, id: string) {
  const res = await fetch(`${orgTemplateBase(orgId)}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete template');
}
