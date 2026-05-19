'use client';
import { useState, useContext } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useBillStore } from '@/store/billStore';
import { saveTemplate } from '@/features/templates/templateApi';
import { orgSaveTemplate } from '@/features/bills/billApi';
import { generateId } from '@/lib/idGenerator';
import type { Template } from '@/types/template';

interface Props { open: boolean; onClose: () => void }

export function SaveTemplateDialog({ open, onClose }: Props) {
  const { currentBill, orgId } = useBillStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!currentBill || !name.trim()) return;
    setSaving(true);
    try {
      const tagList = tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [];

      if (orgId) {
        await orgSaveTemplate(orgId, {
          name: name.trim(),
          description: description.trim() || undefined,
          billType: currentBill.meta.billType,
          blocksJson: currentBill.blocks as never[],
          globalCanvasJson: currentBill.globalCanvasOverlay,
          tags: tagList,
          isDefault: false,
        });
      } else {
        const now = new Date().toISOString();
        const template: Template = {
          id: generateId(),
          name: name.trim(),
          description: description.trim() || undefined,
          billType: currentBill.meta.billType,
          blocks: currentBill.blocks,
          globalCanvasOverlay: currentBill.globalCanvasOverlay,
          createdAt: now,
          updatedAt: now,
          isDefault: false,
          tags: tagList,
        };
        await saveTemplate(template);
      }

      toast.success('Template saved!');
      onClose();
      setName('');
      setDescription('');
      setTags('');
    } catch {
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Template Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Standard Tax Invoice" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this template for?" rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Tags (comma separated)</Label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="invoice, gst, standard" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? 'Saving...' : 'Save Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
