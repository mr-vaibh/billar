import fs from 'fs';
import path from 'path';
import type { Bill, BillMeta } from '@/types/bill';
import type { Template } from '@/types/template';

const BILLS_DIR = process.env.BILLS_DIR || path.join(process.cwd(), 'bills');
const TEMPLATES_DIR = process.env.TEMPLATES_DIR || path.join(process.cwd(), 'templates');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function atomicWrite(filePath: string, data: string) {
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, data, 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

// ─── Bills ────────────────────────────────────────────────────────────────────

export function listBills(): BillMeta[] {
  ensureDir(BILLS_DIR);
  const files = fs.readdirSync(BILLS_DIR).filter((f) => f.endsWith('.json'));
  const metas: BillMeta[] = [];
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(BILLS_DIR, file), 'utf-8');
      const bill: Bill = JSON.parse(raw);
      metas.push(bill.meta);
    } catch {
      // skip corrupted files
    }
  }
  return metas.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function readBill(id: string): Bill | null {
  ensureDir(BILLS_DIR);
  const filePath = path.join(BILLS_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as Bill;
}

export function writeBill(bill: Bill): void {
  ensureDir(BILLS_DIR);
  const filePath = path.join(BILLS_DIR, `${bill.meta.id}.json`);
  atomicWrite(filePath, JSON.stringify(bill, null, 2));
}

export function deleteBill(id: string): boolean {
  const filePath = path.join(BILLS_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
}

// ─── Templates ────────────────────────────────────────────────────────────────

export function listTemplates(): Template[] {
  ensureDir(TEMPLATES_DIR);
  const files = fs.readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith('.json'));
  const templates: Template[] = [];
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(TEMPLATES_DIR, file), 'utf-8');
      templates.push(JSON.parse(raw) as Template);
    } catch {
      // skip
    }
  }
  return templates.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function readTemplate(id: string): Template | null {
  ensureDir(TEMPLATES_DIR);
  const filePath = path.join(TEMPLATES_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as Template;
}

export function writeTemplate(template: Template): void {
  ensureDir(TEMPLATES_DIR);
  const filePath = path.join(TEMPLATES_DIR, `${template.id}.json`);
  atomicWrite(filePath, JSON.stringify(template, null, 2));
}

export function deleteTemplate(id: string): boolean {
  const filePath = path.join(TEMPLATES_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
}
