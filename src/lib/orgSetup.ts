import { db } from './db';
import { generateToken } from './auth';
import { sendInviteEmail } from './email';
import { SYSTEM_ROLE_PERMISSIONS } from './permissions';

const TYPE_CODES: Record<string, string> = {
  invoice: 'INV',
  proforma: 'PRF',
  credit_note: 'CN',
  debit_note: 'DN',
  delivery_challan: 'DC',
  purchase_order: 'PO',
  quotation: 'QT',
};

export async function createOrgWithRoles({
  name,
  slug,
  ownerEmail,
  invitedByUserId,
  inviterName,
}: {
  name: string;
  slug: string;
  ownerEmail: string;
  invitedByUserId: string;
  inviterName: string;
}) {
  return db.$transaction(async (tx) => {
    // 1. Create org
    const org = await tx.organization.create({
      data: { name, slug },
    });

    // 2. Seed OrgSettings
    await tx.orgSettings.create({ data: { orgId: org.id } });

    // 3. Seed system roles
    const systemRoleNames = Object.keys(SYSTEM_ROLE_PERMISSIONS);
    const roles: Record<string, string> = {}; // name → id

    for (const roleName of systemRoleNames) {
      const permissions = SYSTEM_ROLE_PERMISSIONS[roleName];
      const role = await tx.role.create({
        data: {
          orgId: org.id,
          name: roleName,
          isSystem: true,
          rolePermissions: {
            create: permissions.map((p) => ({ permission: p })),
          },
        },
      });
      roles[roleName] = role.id;
    }

    // 4. Create invite token for Owner
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72h

    await tx.inviteToken.create({
      data: {
        token,
        email: ownerEmail.toLowerCase(),
        orgId: org.id,
        roleIds: [roles['Owner']],
        invitedBy: invitedByUserId,
        expiresAt,
      },
    });

    return { org, token, roles };
  }).then(async ({ org, token, roles }) => {
    // Send email outside transaction (non-critical, don't roll back org on email fail)
    await sendInviteEmail({
      to: ownerEmail,
      orgName: name,
      inviterName,
      token,
    });
    return { org, roles };
  });
}

export async function seedInvoiceSequences(orgId: string, prefix: string) {
  const currentFY = getFinancialYear(new Date());
  const billTypes = Object.keys(TYPE_CODES) as Array<keyof typeof TYPE_CODES>;

  await db.invoiceSequence.createMany({
    data: billTypes.map((billType) => ({
      orgId,
      billType: billType as never,
      financialYear: currentFY,
      prefix,
      typeCode: TYPE_CODES[billType],
      zeroPadding: 4,
      currentValue: 0,
    })),
    skipDuplicates: true,
  });
}

export function getFinancialYear(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-indexed
  const startYear = month >= 4 ? year : year - 1;
  const yy1 = String(startYear).slice(-2);
  const yy2 = String(startYear + 1).slice(-2);
  return `${yy1}${yy2}`; // e.g. "2526"
}

export function getFinancialYearFull(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}-${startYear + 1}`; // e.g. "2025-26"
}
