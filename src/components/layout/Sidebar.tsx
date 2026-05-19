'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { FileText, LayoutTemplate, Home, Settings, PlusCircle, Receipt, Building2, LogOut, CreditCard, Users, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  orgId?: string;
}

export function Sidebar({ orgId }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const base = orgId ? `/orgs/${orgId}` : '';

  const NAV = [
    { href: `${base}/`, label: 'Dashboard', icon: Home },
    { href: `${base}/bills`, label: 'All Bills', icon: FileText },
    { href: `${base}/templates`, label: 'Templates', icon: LayoutTemplate },
    { href: `${base}/masters/companies`, label: 'Companies', icon: Building2 },
    { href: `${base}/masters/financial-accounts`, label: 'Accounts', icon: CreditCard },
    { href: `${base}/users`, label: 'Members', icon: Users },
    { href: `${base}/roles`, label: 'Roles', icon: Shield },
  ];

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <aside className="flex flex-col w-56 border-r bg-background h-full shrink-0">
      <div className="flex items-center gap-2 px-4 py-4 border-b">
        <Receipt className="h-6 w-6 text-primary" />
        <span className="font-bold text-lg tracking-tight">Billar</span>
      </div>

      {orgId && (
        <div className="px-3 py-3">
          <Link href={`${base}/bills/new`}>
            <Button className="w-full gap-2" size="sm">
              <PlusCircle className="h-4 w-4" />
              New Bill
            </Button>
          </Link>
        </div>
      )}

      <nav className="flex-1 px-2 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <span className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              pathname === href || (href !== `${base}/` && href !== '/' && pathname.startsWith(href))
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}>
              <Icon className="h-4 w-4" />
              {label}
            </span>
          </Link>
        ))}
      </nav>

      <div className="px-2 py-3 border-t space-y-0.5">
        {orgId && (
          <Link href={`${base}/settings`}>
            <span className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              pathname.startsWith(`${base}/settings`)
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}>
              <Settings className="h-4 w-4" />
              Settings
            </span>
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
