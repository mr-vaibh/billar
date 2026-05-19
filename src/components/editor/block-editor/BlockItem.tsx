'use client';
import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Eye, EyeOff, Lock, Unlock, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useBillStore } from '@/store/billStore';
import { useEditorStore } from '@/store/editorStore';
import type { Block } from '@/types/bill';
import { BLOCK_LABELS, BLOCK_ICONS } from '@/features/bills/billUtils';
import { CompanyHeaderBlock } from './blocks/CompanyHeaderBlock';
import { PartyInfoBlock } from './blocks/PartyInfoBlock';
import { OrderInfoBlock } from './blocks/OrderInfoBlock';
import { ItemsTableBlock } from './blocks/ItemsTableBlock';
import { TaxSummaryBlock } from './blocks/TaxSummaryBlock';
import { BankDetailsBlock } from './blocks/BankDetailsBlock';
import { TermsBlock } from './blocks/TermsBlock';
import { SignatureBlock } from './blocks/SignatureBlock';
import { SupplierInfoBlock } from './blocks/SupplierInfoBlock';
import { CanvasOverlayBlock } from './blocks/CanvasOverlayBlock';

interface Props {
  block: Block;
  isDragging?: boolean;
}

function BlockContent({ block }: { block: Block }) {
  switch (block.type) {
    case 'company_header': return <CompanyHeaderBlock block={block} />;
    case 'party_info': return <PartyInfoBlock block={block} />;
    case 'supplier_info': return <SupplierInfoBlock block={block} />;
    case 'order_info': return <OrderInfoBlock block={block} />;
    case 'items_table': return <ItemsTableBlock block={block} />;
    case 'tax_summary': return <TaxSummaryBlock block={block} />;
    case 'bank_details': return <BankDetailsBlock block={block} />;
    case 'terms': return <TermsBlock block={block} />;
    case 'signature': return <SignatureBlock block={block} />;
    case 'canvas_overlay': return <CanvasOverlayBlock block={block} />;
    case 'spacer': return <div style={{ height: block.data.heightPx }} className="w-full" />;
    default: return null;
  }
}

export function BlockItem({ block, isDragging }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const { removeBlock, updateBlockMeta } = useBillStore();
  const { selectedBlockId, selectBlock } = useEditorStore();
  const isSelected = selectedBlockId === block.id;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({
    id: block.id,
    disabled: block.locked,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-lg border bg-background shadow-sm transition-all',
        isSelected && 'ring-2 ring-primary',
        isSortableDragging && 'opacity-50',
        isDragging && 'opacity-30',
      )}
      onClick={() => selectBlock(block.id)}
    >
      {/* Block header */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b bg-muted/30 rounded-t-lg">
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-6 w-6 cursor-grab active:cursor-grabbing shrink-0', block.locked && 'opacity-30 cursor-not-allowed')}
          {...(block.locked ? {} : { ...attributes, ...listeners })}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </Button>

        <span className="text-sm">{BLOCK_ICONS[block.type]}</span>
        <span className="text-xs font-medium text-muted-foreground flex-1">{BLOCK_LABELS[block.type]}</span>

        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); updateBlockMeta(block.id, { visible: !block.visible }); }} title={block.visible ? 'Hide block' : 'Show block'}>
            {block.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); updateBlockMeta(block.id, { locked: !block.locked }); }} title={block.locked ? 'Unlock' : 'Lock position'}>
            {block.locked ? <Lock className="h-3.5 w-3.5 text-muted-foreground" /> : <Unlock className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }}>
            {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} title="Remove block">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Block content */}
      {!collapsed && (
        <div className="p-4">
          <BlockContent block={block} />
        </div>
      )}
    </div>
  );
}
