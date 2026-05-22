import { redirectIfOrg } from '@/lib/orgRedirect';
import { AppShell } from '@/components/layout/AppShell';
import { listBills } from '@/lib/fileStorage';
import { BillListPage } from '@/components/bills/BillListPage';

export const dynamic = 'force-dynamic';

export default async function BillsPage() {
  await redirectIfOrg('/bills');

  const bills = listBills();
  return (
    <AppShell>
      <BillListPage initialBills={bills} />
    </AppShell>
  );
}
