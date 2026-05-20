'use client';
import { Sidebar } from './Sidebar';

interface Props {
  children: React.ReactNode;
  orgId?: string;
  userName?: string;
  userEmail?: string;
}

export function AppShell({ children, orgId, userName, userEmail }: Props) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar orgId={orgId} userName={userName} userEmail={userEmail} />
      <main className="flex-1 overflow-auto bg-muted/30">
        {children}
      </main>
    </div>
  );
}
