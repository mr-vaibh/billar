import { AppShell } from '@/components/layout/AppShell';
import { listBills } from '@/lib/fileStorage';
import { BillListPage } from '@/components/bills/BillListPage';

export const dynamic = 'force-dynamic';

export default function BillsPage() {
  const bills = listBills();
  return (
    <AppShell>
      <BillListPage initialBills={bills} />
    </AppShell>
  );
}
