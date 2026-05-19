import { InviteForm } from '@/components/auth/InviteForm';
import { Receipt } from 'lucide-react';

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const res = await fetch(`${process.env.APP_URL}/api/auth/invite/${token}`, { cache: 'no-store' });

  if (!res.ok) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold">Invalid or expired invite</h1>
          <p className="text-sm text-muted-foreground">This invite link has already been used or has expired. Please ask your admin to send a new one.</p>
        </div>
      </div>
    );
  }

  const { email, orgName } = await res.json();

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <Receipt className="h-7 w-7 text-primary" />
            <span className="text-2xl font-bold tracking-tight">Billar</span>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            You've been invited to <strong>{orgName}</strong>.<br />Set up your account to get started.
          </p>
        </div>
        <InviteForm token={token} email={email} orgName={orgName} />
      </div>
    </div>
  );
}
