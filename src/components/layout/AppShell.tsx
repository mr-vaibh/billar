'use client';
import { Sidebar } from './Sidebar';

interface Props {
  children: React.ReactNode;
  orgId?: string;
}

export function AppShell({ children, orgId }: Props) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar orgId={orgId} />
      <main className="flex-1 overflow-auto bg-muted/30">
        {children}
      </main>
    </div>
  );
}
