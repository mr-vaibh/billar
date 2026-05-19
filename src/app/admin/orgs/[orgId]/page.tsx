import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { OrgStatusToggle } from '@/components/admin/OrgStatusToggle';
import { ChevronLeft, Users, FileText, LayoutTemplate, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function OrgDetailPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;

  const org = await db.organization.findUnique({
    where: { id: orgId },
    include: {
      _count: { select: { memberships: true, bills: true, templates: true } },
      memberships: {
        where: { isActive: true },
        include: {
          user: { select: { id: true, email: true, name: true } },
          roleAssignments: {
            include: { role: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      inviteTokens: {
        where: { usedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!org) notFound();

  const stats = [
    { label: 'Members', value: org._count.memberships, icon: Users },
    { label: 'Bills', value: org._count.bills, icon: FileText },
    { label: 'Templates', value: org._count.templates, icon: LayoutTemplate },
  ];

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft className="h-4 w-4" /> Organisations
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{org.name}</h1>
              <Badge variant={org.status === 'active' ? 'default' : 'destructive'}>
                {org.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground font-mono mt-0.5">{org.slug}</p>
          </div>
          <OrgStatusToggle orgId={org.id} currentStatus={org.status} />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Created {new Date(org.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="border rounded-xl p-4 bg-background flex items-center gap-3">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Members */}
      <div className="space-y-3">
        <h2 className="font-semibold">Members</h2>
        {org.memberships.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active members yet.</p>
        ) : (
          <div className="border rounded-xl overflow-hidden bg-background">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Roles</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {org.memberships.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 font-medium">{m.user.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.user.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {m.roleAssignments.map((ra) => (
                          <Badge key={ra.role.name} variant="secondary" className="text-xs">{ra.role.name}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(m.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending invites */}
      {org.inviteTokens.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold">Pending Invites</h2>
          <div className="border rounded-xl overflow-hidden bg-background">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Sent</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {org.inviteTokens.map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-4 py-3 flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {inv.email}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(inv.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(inv.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
