import { getSession } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { EditorShell } from '@/components/editor/EditorShell';
import type { Block, BillType } from '@/types/bill';

export default async function NewOrgBillPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ type?: string; templateId?: string }>;
}) {
  const { orgId } = await params;
  const { type, templateId } = await searchParams;
  const user = await getSession();
  if (!user) redirect('/login');

  const perms = await getPermissions(user.id, orgId);
  const billType = type ?? 'invoice';
  if (!perms.has(`bills:create:${billType}`) && !perms.has('bills:create')) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        You don't have permission to create {billType} bills.
      </div>
    );
  }

  let initialTemplateBlocks: Block[] | undefined;
  if (templateId) {
    const template = await db.template.findUnique({ where: { id: templateId, orgId } });
    if (template) {
      initialTemplateBlocks = template.blocksJson as unknown as Block[];
    }
  }

  return (
    <EditorShell
      billId={null}
      initialBill={null}
      orgId={orgId}
      defaultBillType={billType}
      initialTemplateBlocks={initialTemplateBlocks}
    />
  );
}
