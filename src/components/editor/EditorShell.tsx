'use client';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useBillStore } from '@/store/billStore';
import { useEditorStore } from '@/store/editorStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { Bill } from '@/types/bill';
import { BlockEditor } from './block-editor/BlockEditor';
import { EditorToolbar } from './EditorToolbar';
import { DuplicateWarningDialog } from '@/components/bills/DuplicateWarningDialog';
import { AppShell } from '@/components/layout/AppShell';
import { detectDuplicates } from '@/features/bills/billDuplicateDetector';
import { fetchBill } from '@/features/bills/billApi';

interface Props {
  billId: string | null;
  initialBill: Bill | null;
  orgId?: string;
  defaultBillType?: string;
}

export function EditorShell({ billId, initialBill, orgId, defaultBillType }: Props) {
  const { newBill, currentBill, billIndex, loadBillIndex, saveBillNow, isDirty, setDuplicateResult, showDuplicateWarning, setOrgId } = useBillStore();
  const { mode } = useEditorStore();
  const { autoSave } = useSettingsStore();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize bill
  useEffect(() => {
    setOrgId(orgId ?? null);
    if (initialBill) {
      useBillStore.setState({ currentBill: initialBill, isDirty: false });
    } else if (!billId) {
      newBill(defaultBillType ?? 'invoice');
    }
    loadBillIndex();
  }, [billId]); // eslint-disable-line

  // Warn before unload when there are unsaved changes
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!isDirty) return;
      e.preventDefault();
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  // Autosave with debounce (only when autoSave is enabled)
  useEffect(() => {
    if (!autoSave || !isDirty || !currentBill) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await saveBillNow();
        // Run duplicate detection after save
        if (billIndex.length > 0 && currentBill) {
          const result = detectDuplicates(currentBill, billIndex, (id) => {
            // Synchronous lookup from index won't have full bill, skip for now
            return null;
          });
          setDuplicateResult(result);
        }
      } catch {
        toast.error('Auto-save failed');
      }
    }, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [isDirty, currentBill, autoSave]); // eslint-disable-line

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveBillNow().then(() => toast.success('Saved')).catch(() => toast.error('Save failed'));
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        useBillStore.getState().undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        useBillStore.getState().redo();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []); // eslint-disable-line

  const content = (
    <div className="flex flex-col h-full">
      <EditorToolbar />
      <div className="flex-1 overflow-auto">
        <BlockEditor />
      </div>
      {showDuplicateWarning && <DuplicateWarningDialog />}
    </div>
  );

  // Org layout already provides AppShell; only wrap when in standalone (legacy) mode
  if (orgId) return content;
  return <AppShell>{content}</AppShell>;
}
