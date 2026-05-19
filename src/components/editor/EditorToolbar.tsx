'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Save, Undo2, Redo2, Eye, ChevronLeft, Download, Copy, AlertTriangle, CheckCircle, Loader2, LayoutTemplate } from 'lucide-react';
import { SaveTemplateDialog } from '@/components/templates/SaveTemplateDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBillStore } from '@/store/billStore';
import { useEditorStore } from '@/store/editorStore';
import { exportToPdf } from '@/features/export/exportPdf';
import { exportToExcel } from '@/features/export/exportExcel';
import { exportToWord } from '@/features/export/exportWord';
import { BILL_TYPE_LABELS } from '@/features/bills/billUtils';
import type { BillType, BillStatus } from '@/types/bill';
import { duplicateBill } from '@/features/bills/billApi';

export function EditorToolbar() {
  const { currentBill, saveBillNow, isSaving, isDirty, undo, redo, undoStack, redoStack, duplicateResult, showDuplicateWarning, updateBillMeta } = useBillStore();
  const { setPreviewMode } = useEditorStore();
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);

  if (!currentBill) return null;

  async function handleSave() {
    try {
      await saveBillNow();
      toast.success('Saved successfully');
    } catch {
      toast.error('Save failed');
    }
  }

  async function handleExport(format: 'pdf' | 'word' | 'excel') {
    if (!currentBill) return;
    setIsExporting(true);
    try {
      if (format === 'pdf') await exportToPdf(currentBill);
      else if (format === 'excel') await exportToExcel(currentBill);
      else await exportToWord(currentBill);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (e) {
      toast.error('Export failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDuplicate() {
    if (!currentBill) return;
    try {
      const newBill = await duplicateBill(currentBill.meta.id);
      toast.success('Bill duplicated');
      router.push(`/bills/${newBill.meta.id}`);
    } catch {
      toast.error('Duplicate failed');
    }
  }

  const statusColors: Record<BillStatus, string> = {
    draft: 'bg-yellow-100 text-yellow-800',
    finalized: 'bg-blue-100 text-blue-800',
    sent: 'bg-purple-100 text-purple-800',
    paid: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b bg-background sticky top-0 z-10 flex-wrap">
      <Link href="/bills">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </Link>

      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="font-semibold text-sm truncate">{currentBill.meta.billNumber || 'New Bill'}</span>
        <Select value={currentBill.meta.billType} onValueChange={(v) => v && updateBillMeta({ billType: v as BillType })}>
          <SelectTrigger className="h-7 w-40 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(BILL_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={currentBill.meta.status} onValueChange={(v) => v && updateBillMeta({ status: v as BillStatus })}>
          <SelectTrigger className="h-7 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(['draft', 'finalized', 'sent', 'paid', 'cancelled'] as BillStatus[]).map((s) => (
              <SelectItem key={s} value={s} className="text-xs">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Duplicate warning indicator */}
      {duplicateResult?.isDuplicate && (
        <Button variant="outline" size="sm" className="h-7 gap-1 text-yellow-700 border-yellow-300 bg-yellow-50 text-xs" onClick={() => useBillStore.setState({ showDuplicateWarning: true })}>
          <AlertTriangle className="h-3.5 w-3.5" />
          Possible duplicate
        </Button>
      )}

      {/* Save status */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {isSaving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving...</> : isDirty ? <span className="text-orange-500">Unsaved</span> : <><CheckCircle className="h-3.5 w-3.5 text-green-500" />Saved</>}
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={undo} disabled={!undoStack.length} title="Undo (⌘Z)">
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={redo} disabled={!redoStack.length} title="Redo (⌘⇧Z)">
          <Redo2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Preview" onClick={() => router.push(`/bills/${currentBill.meta.id}/preview`)}>
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Duplicate" onClick={handleDuplicate}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-border bg-background px-2.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50" disabled={isExporting}>
            {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Export
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleExport('pdf')}>Export as PDF</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('word')}>Export as Word (.docx)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('excel')}>Export as Excel (.xlsx)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Save as Template" onClick={() => setSaveTemplateOpen(true)}>
          <LayoutTemplate className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" className="h-8 gap-1 text-xs" onClick={handleSave} disabled={isSaving || !isDirty}>
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </Button>
      </div>
      <SaveTemplateDialog open={saveTemplateOpen} onClose={() => setSaveTemplateOpen(false)} />
    </div>
  );
}
