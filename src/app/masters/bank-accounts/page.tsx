import { redirectIfOrg } from '@/lib/orgRedirect';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function StandaloneBankAccountsPage() {
  await redirectIfOrg('/masters/bank-accounts');
  redirect('/login');
}
