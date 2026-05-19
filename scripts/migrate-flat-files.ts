/**
 * Migrate flat-file bills and templates into the PostgreSQL DB.
 *
 * Usage:
 *   npx tsx scripts/migrate-flat-files.ts --orgId <orgId> --userId <userId>
 *
 * Options:
 *   --orgId    Required. Target organization ID.
 *   --userId   Required. User ID to attribute createdBy/updatedBy.
 *   --billsDir Path to bills directory (default: ./bills)
 *   --templatesDir Path to templates directory (default: ./templates)
 *   --dryRun   Print what would be done without writing to DB.
 */

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import type { Bill } from '../src/types/bill';
import type { Template } from '../src/types/template';

const args = process.argv.slice(2);
function arg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 ? args[idx + 1] : undefined;
}

const orgId = arg('orgId') as string;
const userId = arg('userId') as string;
const billsDir = arg('billsDir') ?? path.join(process.cwd(), 'bills');
const templatesDir = arg('templatesDir') ?? path.join(process.cwd(), 'templates');
const dryRun = args.includes('--dryRun');

if (!arg('orgId') || !arg('userId')) {
  console.error('Usage: npx tsx scripts/migrate-flat-files.ts --orgId <id> --userId <id> [--dryRun]');
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

function getFinancialYear(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    const now = new Date();
    const m = now.getMonth() + 1;
    const y = now.getFullYear();
    const startYear = m >= 4 ? y : y - 1;
    return `${String(startYear).slice(-2)}${String(startYear + 1).slice(-2)}`;
  }
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const startYear = month >= 4 ? year : year - 1;
  return `${String(startYear).slice(-2)}${String(startYear + 1).slice(-2)}`;
}

async function migrateBills() {
  if (!fs.existsSync(billsDir)) {
    console.log(`Bills dir not found: ${billsDir} — skipping bills`);
    return;
  }

  const files = fs.readdirSync(billsDir).filter((f) => f.endsWith('.json'));
  console.log(`Found ${files.length} bill files`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(billsDir, file), 'utf-8');
      const bill: Bill = JSON.parse(raw);
      const { meta, blocks, globalCanvasOverlay, schemaVersion } = bill;

      // Check if already imported (by legacyId)
      const existing = await db.bill.findFirst({ where: { orgId, legacyId: meta.id } });
      if (existing) {
        console.log(`  SKIP  ${meta.billNumber || meta.id} (already migrated)`);
        skipped++;
        continue;
      }

      // Extract buyer name and grand total from blocks
      let buyerName: string | undefined;
      let grandTotal: number | undefined;
      let billDate: string | undefined;

      for (const block of blocks) {
        if (block.type === 'party_info') buyerName = block.data.buyer.name || undefined;
        if (block.type === 'supplier_info' && !buyerName) buyerName = block.data.supplierName || undefined;
        if (block.type === 'items_table') grandTotal = block.data.grandTotal || undefined;
        if (block.type === 'order_info') billDate = block.data.billDate || undefined;
      }

      const financialYear = meta.financialYear ?? getFinancialYear(billDate ?? meta.createdAt);
      const billNumber = meta.billNumber || `LEGACY-${meta.id.slice(-8)}`;

      if (dryRun) {
        console.log(`  DRY   ${billNumber} (${meta.billType}, ${meta.status}, FY ${financialYear})`);
        imported++;
        continue;
      }

      await db.bill.create({
        data: {
          orgId,
          legacyId: meta.id,
          billNumber,
          billType: meta.billType as never,
          status: meta.status as never,
          financialYear,
          currency: meta.currency ?? 'INR',
          tags: meta.tags ?? [],
          blocksJson: blocks as never,
          globalCanvasJson: globalCanvasOverlay as never ?? null,
          schemaVersion: schemaVersion ?? 1,
          buyerName: buyerName ?? null,
          grandTotal: grandTotal ?? null,
          createdBy: userId,
          updatedBy: userId,
          createdAt: new Date(meta.createdAt),
          updatedAt: new Date(meta.updatedAt),
        },
      });

      console.log(`  OK    ${billNumber} (${meta.billType})`);
      imported++;
    } catch (e) {
      console.error(`  FAIL  ${file}: ${e instanceof Error ? e.message : e}`);
      failed++;
    }
  }

  console.log(`\nBills: ${imported} imported, ${skipped} skipped, ${failed} failed`);
}

async function migrateTemplates() {
  if (!fs.existsSync(templatesDir)) {
    console.log(`Templates dir not found: ${templatesDir} — skipping templates`);
    return;
  }

  const files = fs.readdirSync(templatesDir).filter((f) => f.endsWith('.json'));
  console.log(`Found ${files.length} template files`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(templatesDir, file), 'utf-8');
      const template: Template = JSON.parse(raw);

      const existing = await db.template.findFirst({ where: { orgId, legacyId: template.id } });
      if (existing) {
        console.log(`  SKIP  ${template.name} (already migrated)`);
        skipped++;
        continue;
      }

      if (dryRun) {
        console.log(`  DRY   ${template.name} (${template.billType})`);
        imported++;
        continue;
      }

      await db.template.create({
        data: {
          orgId,
          legacyId: template.id,
          name: template.name,
          description: template.description ?? null,
          billType: template.billType as never,
          blocksJson: template.blocks as never,
          globalCanvasJson: template.globalCanvasOverlay as never ?? null,
          isDefault: template.isDefault ?? false,
          tags: template.tags ?? [],
          createdBy: userId,
          updatedBy: userId,
          createdAt: new Date(template.createdAt),
          updatedAt: new Date(template.updatedAt),
        },
      });

      console.log(`  OK    ${template.name}`);
      imported++;
    } catch (e) {
      console.error(`  FAIL  ${file}: ${e instanceof Error ? e.message : e}`);
      failed++;
    }
  }

  console.log(`\nTemplates: ${imported} imported, ${skipped} skipped, ${failed} failed`);
}

async function main() {
  console.log(`Migrating to org: ${orgId}${dryRun ? ' (DRY RUN)' : ''}\n`);

  console.log('=== Bills ===');
  await migrateBills();

  console.log('\n=== Templates ===');
  await migrateTemplates();

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  db.$disconnect();
  process.exit(1);
});
