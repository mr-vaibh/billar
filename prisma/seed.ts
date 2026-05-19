import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@billar.app';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'changeme123';

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Super admin already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.user.create({
    data: {
      email,
      name: 'Super Admin',
      passwordHash,
      isSuperAdmin: true,
      mustChangePassword: true,
    },
  });

  console.log(`Created super admin: ${email}`);
  console.log(`Temporary password: ${password}`);
  console.log('Change this password immediately after first login.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
