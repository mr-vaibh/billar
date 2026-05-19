'use client';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Bill, Block, BlockType, BillMeta, DuplicateDetectionResult } from '@/types/bill';
import { createNewBill, createDefaultBlock } from '@/features/bills/billUtils';
import { saveBill, createBill, fetchBills, fetchBill } from '@/features/bills/billApi';
import { computeItemsTable, computeTaxSummary } from '@/features/gst/gstCalculator';
import type { LineItem, ItemsTableData } from '@/types/bill';

const MAX_UNDO = 50;

interface BillState {
  currentBill: Bill | null;
  billIndex: BillMeta[];
  isSaving: boolean;
  isDirty: boolean;
  undoStack: Bill[];
  redoStack: Bill[];
  duplicateResult: DuplicateDetectionResult | null;
  showDuplicateWarning: boolean;
  lastSavedAt: Date | null;

  // Actions
  loadBillIndex: () => Promise<void>;
  loadBill: (id: string) => Promise<void>;
  newBill: (type?: string, templateBlocks?: Bill['blocks']) => void;
  saveBillNow: () => Promise<void>;
  markDirty: () => void;
  updateBlock: (blockId: string, data: Record<string, unknown>) => void;
  updateBlockMeta: (blockId: string, meta: Partial<Block>) => void;
  addBlock: (type: BlockType, afterBlockId?: string) => void;
  removeBlock: (blockId: string) => void;
  reorderBlocks: (fromIndex: number, toIndex: number) => void;
  updateBillMeta: (meta: Partial<Bill['meta']>) => void;
  updateItemsTable: (items: LineItem[]) => void;
  undo: () => void;
  redo: () => void;
  pushUndoSnapshot: () => void;
  setDuplicateResult: (result: DuplicateDetectionResult | null) => void;
  dismissDuplicateWarning: () => void;
}

export const useBillStore = create<BillState>()(
  immer((set, get) => ({
    currentBill: null,
    billIndex: [],
    isSaving: false,
    isDirty: false,
    undoStack: [],
    redoStack: [],
    duplicateResult: null,
    showDuplicateWarning: false,
    lastSavedAt: null,

    loadBillIndex: async () => {
      try {
        const metas = await fetchBills();
        set((s) => { s.billIndex = metas; });
      } catch {}
    },

    loadBill: async (id) => {
      const bill = await fetchBill(id);
      set((s) => {
        s.currentBill = bill;
        s.isDirty = false;
        s.undoStack = [];
        s.redoStack = [];
      });
    },

    newBill: (type = 'invoice', templateBlocks) => {
      const bill = createNewBill(type as Bill['meta']['billType']);
      if (templateBlocks) bill.blocks = templateBlocks;
      set((s) => {
        s.currentBill = bill;
        s.isDirty = true;
        s.undoStack = [];
        s.redoStack = [];
      });
    },

    saveBillNow: async () => {
      const { currentBill, billIndex } = get();
      if (!currentBill) return;

      set((s) => { s.isSaving = true; });
      try {
        const now = new Date().toISOString();
        const billToSave = { ...currentBill, meta: { ...currentBill.meta, updatedAt: now } };
        const isNew = !billIndex.find((m) => m.id === currentBill.meta.id);
        const saved = isNew ? await createBill(billToSave) : await saveBill(billToSave);
        set((s) => {
          s.currentBill = saved;
          s.isDirty = false;
          s.isSaving = false;
          s.lastSavedAt = new Date();
          const idx = s.billIndex.findIndex((m) => m.id === saved.meta.id);
          if (idx >= 0) s.billIndex[idx] = saved.meta;
          else s.billIndex.unshift(saved.meta);
        });
      } catch {
        set((s) => { s.isSaving = false; });
        throw new Error('Save failed');
      }
    },

    markDirty: () => set((s) => { s.isDirty = true; }),

    pushUndoSnapshot: () => {
      const { currentBill } = get();
      if (!currentBill) return;
      set((s) => {
        s.undoStack.push(JSON.parse(JSON.stringify(currentBill)));
        if (s.undoStack.length > MAX_UNDO) s.undoStack.shift();
        s.redoStack = [];
      });
    },

    updateBlock: (blockId, data) => {
      set((s) => {
        const idx = s.currentBill?.blocks.findIndex((b) => b.id === blockId);
        if (idx === undefined || idx < 0 || !s.currentBill) return;
        (s.currentBill.blocks[idx] as Record<string, unknown>).data = data;
        s.isDirty = true;
      });
    },

    updateBlockMeta: (blockId, meta) => {
      set((s) => {
        const idx = s.currentBill?.blocks.findIndex((b) => b.id === blockId);
        if (idx === undefined || idx < 0 || !s.currentBill) return;
        Object.assign(s.currentBill.blocks[idx], meta);
        s.isDirty = true;
      });
    },

    addBlock: (type, afterBlockId) => {
      get().pushUndoSnapshot();
      set((s) => {
        if (!s.currentBill) return;
        const blocks = s.currentBill.blocks;
        let insertIdx = blocks.length;
        if (afterBlockId) {
          const idx = blocks.findIndex((b) => b.id === afterBlockId);
          if (idx >= 0) insertIdx = idx + 1;
        }
        const newBlock = createDefaultBlock(type, insertIdx);
        blocks.splice(insertIdx, 0, newBlock);
        blocks.forEach((b, i) => { b.order = i; });
        s.isDirty = true;
      });
    },

    removeBlock: (blockId) => {
      get().pushUndoSnapshot();
      set((s) => {
        if (!s.currentBill) return;
        s.currentBill.blocks = s.currentBill.blocks.filter((b) => b.id !== blockId);
        s.currentBill.blocks.forEach((b, i) => { b.order = i; });
        s.isDirty = true;
      });
    },

    reorderBlocks: (fromIndex, toIndex) => {
      get().pushUndoSnapshot();
      set((s) => {
        if (!s.currentBill) return;
        const blocks = s.currentBill.blocks;
        const [moved] = blocks.splice(fromIndex, 1);
        blocks.splice(toIndex, 0, moved);
        blocks.forEach((b, i) => { b.order = i; });
        s.isDirty = true;
      });
    },

    updateBillMeta: (meta) => {
      set((s) => {
        if (!s.currentBill) return;
        Object.assign(s.currentBill.meta, meta);
        s.isDirty = true;
      });
    },

    updateItemsTable: (items) => {
      set((s) => {
        if (!s.currentBill) return;
        const tableBlock = s.currentBill.blocks.find((b) => b.type === 'items_table');
        if (!tableBlock || tableBlock.type !== 'items_table') return;

        const gstMode = tableBlock.data.gstMode;
        const computed = computeItemsTable(items, gstMode);
        tableBlock.data = { ...tableBlock.data, items, ...computed };

        // Auto-update tax summary block
        const taxBlock = s.currentBill.blocks.find((b) => b.type === 'tax_summary');
        if (taxBlock && taxBlock.type === 'tax_summary') {
          taxBlock.data = computeTaxSummary(tableBlock.data as ItemsTableData);
        }
        s.isDirty = true;
      });
    },

    undo: () => {
      const { undoStack, currentBill } = get();
      if (!undoStack.length || !currentBill) return;
      set((s) => {
        s.redoStack.push(JSON.parse(JSON.stringify(currentBill)));
        s.currentBill = JSON.parse(JSON.stringify(s.undoStack.pop()));
        s.isDirty = true;
      });
    },

    redo: () => {
      const { redoStack, currentBill } = get();
      if (!redoStack.length || !currentBill) return;
      set((s) => {
        s.undoStack.push(JSON.parse(JSON.stringify(currentBill)));
        s.currentBill = JSON.parse(JSON.stringify(s.redoStack.pop()));
        s.isDirty = true;
      });
    },

    setDuplicateResult: (result) =>
      set((s) => {
        s.duplicateResult = result;
        s.showDuplicateWarning = result?.isDuplicate ?? false;
      }),

    dismissDuplicateWarning: () =>
      set((s) => { s.showDuplicateWarning = false; }),
  }))
);
