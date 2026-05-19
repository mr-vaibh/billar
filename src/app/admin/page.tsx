import Link from 'next/link';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OrgStatusToggle } from '@/components/admin/OrgStatusToggle';
import { PlusCircle, Building2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const orgs = await db.organization.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { memberships: true, bills: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Organisations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{orgs.length} total</p>
        </div>
        <Link href="/admin/orgs/new">
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" />
            New Organisation
          </Button>
        </Link>
      </div>

      {orgs.length === 0 ? (
        <div className="border rounded-xl p-12 text-center text-muted-foreground">
          <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No organisations yet</p>
          <p className="text-sm mt-1">Create your first one to get started.</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-background">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Slug</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Members</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Bills</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {orgs.map((org) => (
                <tr key={org.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/admin/orgs/${org.id}`} className="hover:text-primary transition-colors">
                      {org.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{org.slug}</td>
                  <td className="px-4 py-3">
                    <Badge variant={org.status === 'active' ? 'default' : 'destructive'} className="text-xs">
                      {org.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{org._count.memberships}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{org._count.bills}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(org.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <OrgStatusToggle orgId={org.id} currentStatus={org.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
