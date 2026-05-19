'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LayoutTemplate, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { orgDeleteTemplate, orgCreateBill } from '@/features/bills/billApi';
import { createNewBill } from '@/features/bills/billUtils';
import { BILL_TYPE_LABELS } from '@/features/bills/billUtils';
import { formatDistanceToNow } from 'date-fns';
import type { Template } from '@/types/template';
import type { Block } from '@/types/bill';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

interface Props {
  orgId: string;
  initialTemplates: Template[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export function OrgTemplatesClient({ orgId, initialTemplates, canDelete }: Props) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleUse(template: Template) {
    try {
      const bill = createNewBill(template.billType);
      bill.blocks = template.blocks as Block[];
      bill.meta.templateId = template.id;
      if (template.globalCanvasOverlay) bill.globalCanvasOverlay = template.globalCanvasOverlay;
      const created = await orgCreateBill(orgId, bill);
      toast.success('Bill created from template');
      router.push(`/orgs/${orgId}/bills/${created.meta.id}`);
    } catch {
      toast.error('Failed to create bill from template');
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      await orgDeleteTemplate(orgId, id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      setConfirmId(null);
      toast.success('Template deleted');
    } catch {
      toast.error('Failed to delete template');
    } finally {
      setDeleting(false);
    }
  }

  const confirmTemplate = templates.find((t) => t.id === confirmId);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Templates</h1>
        <p className="text-sm text-muted-foreground mt-1">Reusable bill layouts. Save a template from the bill editor toolbar.</p>
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <LayoutTemplate className="h-10 w-10 opacity-30" />
          <p className="text-sm">No templates yet. Open a bill and click the template icon in the toolbar to save one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="border rounded-lg p-4 space-y-3 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 flex-1 min-w-0">
                  <p className="font-medium truncate">{t.name}</p>
                  {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                </div>
                {t.isDefault && <Badge variant="secondary" className="text-xs shrink-0">Default</Badge>}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  {(BILL_TYPE_LABELS as Record<string, string>)[t.billType] ?? t.billType}
                </Badge>
                {t.tags?.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true })}
              </p>

              <div className="flex gap-2 pt-1">
                <Button size="sm" className="flex-1" onClick={() => handleUse(t)}>Use Template</Button>
                {canDelete && (
                  <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setConfirmId(t.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!confirmId} onOpenChange={() => setConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete template?</DialogTitle>
            <DialogDescription>
              <strong>{confirmTemplate?.name}</strong> will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleting} onClick={() => confirmId && handleDelete(confirmId)}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
