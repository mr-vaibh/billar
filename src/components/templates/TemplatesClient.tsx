'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LayoutTemplate, Plus, Trash2, Pencil, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Template } from '@/types/template';
import { deleteTemplate } from '@/features/templates/templateApi';
import { BILL_TYPE_LABELS } from '@/features/bills/billUtils';
import { formatDistanceToNow } from 'date-fns';
import { createBill } from '@/features/bills/billApi';
import { createNewBill } from '@/features/bills/billUtils';

interface Props { initialTemplates: Template[] }

export function TemplatesClient({ initialTemplates }: Props) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Template | null>(null);

  async function handleUseTemplate(template: Template) {
    try {
      const bill = createNewBill(template.billType);
      bill.blocks = template.blocks;
      bill.meta.templateId = template.id;
      if (template.globalCanvasOverlay) bill.globalCanvasOverlay = template.globalCanvasOverlay;
      const created = await createBill(bill);
      toast.success('Bill created from template');
      router.push(`/bills/${created.meta.id}`);
    } catch {
      toast.error('Failed to create bill from template');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this template?')) return;
    try {
      await deleteTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success('Template deleted');
    } catch {
      toast.error('Failed to delete template');
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-sm text-muted-foreground">Reusable bill layouts for faster billing</p>
        </div>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
            <LayoutTemplate className="h-12 w-12 opacity-20" />
            <p className="text-lg font-medium">No templates yet</p>
            <p className="text-sm">Save a bill as a template from the bill editor to reuse it quickly.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  {template.isDefault && <Badge variant="secondary" className="text-xs shrink-0">Default</Badge>}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="outline" className="text-xs">{BILL_TYPE_LABELS[template.billType]}</Badge>
                  <span className="text-xs text-muted-foreground">{template.blocks.length} blocks</span>
                </div>
                {template.description && <p className="text-xs text-muted-foreground mt-1">{template.description}</p>}
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {template.tags && template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {template.tags.map((tag) => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Updated {formatDistanceToNow(new Date(template.updatedAt), { addSuffix: true })}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 gap-1.5" onClick={() => handleUseTemplate(template)}>
                    <FileText className="h-3.5 w-3.5" />Use Template
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(template.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
