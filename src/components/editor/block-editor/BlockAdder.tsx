'use client';
import { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useBillStore } from '@/store/billStore';
import { useEditorStore } from '@/store/editorStore';
import type { BlockType } from '@/types/bill';
import { BLOCK_LABELS, BLOCK_ICONS } from '@/features/bills/billUtils';

const ADDABLE_BLOCKS: BlockType[] = [
  'supplier_info', 'canvas_overlay', 'spacer',
  'company_header', 'party_info', 'order_info', 'items_table', 'tax_summary',
  'bank_details', 'terms', 'signature',
];

export function BlockAdder() {
  const { addBlock, currentBill } = useBillStore();
  const { selectedBlockId } = useEditorStore();
  const [open, setOpen] = useState(false);

  function handleAdd(type: BlockType) {
    addBlock(type, selectedBlockId ?? undefined);
    setOpen(false);
  }

  // Determine which blocks are already present (for single-use blocks)
  const presentTypes = new Set(currentBill?.blocks.map((b) => b.type) ?? []);
  const singleUseTypes: BlockType[] = ['company_header', 'party_info', 'order_info', 'items_table', 'tax_summary', 'bank_details', 'terms', 'signature'];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
        <PlusCircle className="h-4 w-4" />
        Add Block
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="center">
        <p className="text-xs text-muted-foreground font-medium px-2 pb-2">Insert block {selectedBlockId ? 'after selected' : 'at end'}</p>
        <div className="grid grid-cols-1 gap-0.5">
          {ADDABLE_BLOCKS.map((type) => {
            const isDisabled = singleUseTypes.includes(type) && presentTypes.has(type);
            return (
              <Button
                key={type}
                variant="ghost"
                size="sm"
                className="justify-start gap-2 text-sm h-8"
                disabled={isDisabled}
                onClick={() => handleAdd(type)}
              >
                <span>{BLOCK_ICONS[type]}</span>
                <span>{BLOCK_LABELS[type]}</span>
                {isDisabled && <span className="ml-auto text-xs text-muted-foreground">Added</span>}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
