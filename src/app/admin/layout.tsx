import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import LogoutButton from './logout-button';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user || !user.isSuperAdmin) {
    redirect('/admin/login');
  }
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg tracking-tight">Billar</span>
          <span className="text-xs bg-destructive/10 text-destructive font-medium px-2 py-0.5 rounded">Super Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
