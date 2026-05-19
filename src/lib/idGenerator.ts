import { nanoid } from 'nanoid';

export function generateId(): string {
  return nanoid(12);
}

export function generateBillNumber(prefix: string, sequence: number, fy: string): string {
  const fyShort = fy.replace('-', '').slice(2, 6); // '2526' from '2025-26'
  return `${prefix}/${fyShort}/${String(sequence).padStart(4, '0')}`;
}

export function getCurrentFinancialYear(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  if (month >= 4) {
    return `${year}-${String(year + 1).slice(2)}`;
  }
  return `${year - 1}-${String(year).slice(2)}`;
}
