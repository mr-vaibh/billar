import { redirectIfOrg } from '@/lib/orgRedirect';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function StandaloneCustomersPage() {
  await redirectIfOrg('/masters/customers');
  redirect('/login');
}
