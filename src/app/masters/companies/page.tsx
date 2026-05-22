import { redirectIfOrg } from '@/lib/orgRedirect';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function StandaloneCompaniesPage() {
  await redirectIfOrg('/masters/companies');
  redirect('/login');
}
