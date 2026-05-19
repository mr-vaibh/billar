import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { AppShell } from '@/components/layout/AppShell';
import { OrgProvider } from '@/components/layout/OrgProvider';

interface Props {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}

export default async function OrgLayout({ children, params }: Props) {
  const { orgId } = await params;
  const user = await getSession();

  if (!user) redirect('/login');

  const membership = await db.orgMembership.findUnique({
    where: { orgId_userId: { orgId, userId: user.id } },
    include: { org: true },
  });

  if (!membership || !membership.isActive || membership.org.status !== 'active') {
    redirect('/login');
  }

  return (
    <OrgProvider orgId={orgId} orgName={membership.org.name} userId={user.id}>
      <AppShell orgId={orgId}>
        {children}
      </AppShell>
    </OrgProvider>
  );
}
