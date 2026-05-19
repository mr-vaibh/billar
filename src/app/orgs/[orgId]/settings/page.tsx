import { getSession } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrgSettingsClient } from '@/components/settings/OrgSettingsClient';
import { SettingsClient } from '@/components/settings/SettingsClient';

export const dynamic = 'force-dynamic';

export default async function OrgSettingsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const user = await getSession();
  if (!user) redirect('/login');

  const perms = await getPermissions(user.id, orgId);
  if (!perms.has('settings:read')) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        You don't have permission to view settings.
      </div>
    );
  }

  const [settings, sequences] = await Promise.all([
    db.orgSettings.upsert({ where: { orgId }, create: { orgId }, update: {} }),
    db.invoiceSequence.findMany({
      where: { orgId },
      orderBy: [{ billType: 'asc' }, { financialYear: 'desc' }],
      include: { history: { orderBy: { performedAt: 'desc' }, take: 5 } },
    }),
  ]);

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Organisation defaults and invoice configuration.</p>
      </div>

      <Tabs defaultValue="org">
        <TabsList>
          <TabsTrigger value="org">Organisation</TabsTrigger>
          <TabsTrigger value="personal">Personal</TabsTrigger>
        </TabsList>

        <TabsContent value="org" className="pt-6">
          <OrgSettingsClient
            orgId={orgId}
            initialSettings={{
              defaultGstMode: settings.defaultGstMode,
              defaultIgstRate: settings.defaultIgstRate,
              defaultCgstRate: settings.defaultCgstRate,
              defaultSgstRate: settings.defaultSgstRate,
              allowCompanyOverride: settings.allowCompanyOverride,
              allowBankOverride: settings.allowBankOverride,
            }}
            initialSequences={sequences.map((s) => ({
              id: s.id,
              billType: s.billType,
              financialYear: s.financialYear,
              prefix: s.prefix,
              typeCode: s.typeCode,
              zeroPadding: s.zeroPadding,
              currentValue: s.currentValue,
              history: s.history.map((h) => ({
                id: h.id,
                previousValue: h.previousValue,
                newValue: h.newValue,
                reason: h.reason,
                performedAt: h.performedAt.toISOString(),
              })),
            }))}
            canEdit={perms.has('settings:edit')}
          />
        </TabsContent>

        <TabsContent value="personal" className="pt-6">
          <SettingsClient />
        </TabsContent>
      </Tabs>
    </div>
  );
}
