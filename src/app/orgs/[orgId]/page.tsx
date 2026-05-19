import { redirect } from 'next/navigation';

export default async function OrgHomePage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  redirect(`/orgs/${orgId}/bills`);
}
