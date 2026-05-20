import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ProfileClient } from '@/components/account/ProfileClient';

export const dynamic = 'force-dynamic';

export default async function ProfilePage({ params }: { params: Promise<{ orgId: string }> }) {
  await params;
  const user = await getSession();
  if (!user) redirect('/login');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account details and security.</p>
      </div>
      <ProfileClient
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt.toISOString(),
        }}
      />
    </div>
  );
}
