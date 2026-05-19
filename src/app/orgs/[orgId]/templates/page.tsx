import { getSession } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { OrgTemplatesClient } from '@/components/templates/OrgTemplatesClient';
import type { BillType } from '@/types/bill';

export const dynamic = 'force-dynamic';

export default async function OrgTemplatesPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const user = await getSession();
  if (!user) redirect('/login');

  const perms = await getPermissions(user.id, orgId);
  if (!perms.has('templates:read')) {
    return <div className="p-8 text-sm text-muted-foreground">You don't have permission to view templates.</div>;
  }

  const templates = await db.template.findMany({
    where: { orgId },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });

  return (
    <OrgTemplatesClient
      orgId={orgId}
      initialTemplates={templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description ?? undefined,
        billType: t.billType as BillType,
        blocks: t.blocksJson as never,
        globalCanvasOverlay: t.globalCanvasJson as never,
        isDefault: t.isDefault,
        tags: t.tags,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }))}
      canCreate={perms.has('templates:create')}
      canEdit={perms.has('templates:edit')}
      canDelete={perms.has('templates:delete')}
    />
  );
}
