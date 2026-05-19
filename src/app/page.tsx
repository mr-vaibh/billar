import { AppShell } from '@/components/layout/AppShell';
import { listBills } from '@/lib/fileStorage';
import { DashboardClient } from '@/components/bills/DashboardClient';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const bills = listBills();
  const totalBills = bills.length;
  const draftCount = bills.filter((b) => b.status === 'draft').length;
  const finalizedCount = bills.filter((b) => b.status === 'finalized').length;
  const totalRevenue = bills
    .filter((b) => b.status !== 'cancelled')
    .reduce((s, b) => s + (b.grandTotal ?? 0), 0);

  return (
    <AppShell>
      <DashboardClient
        stats={{ totalBills, draftCount, finalizedCount, totalRevenue }}
        recentBills={bills.slice(0, 8)}
      />
    </AppShell>
  );
}
