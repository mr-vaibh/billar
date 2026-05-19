'use client';
import { useState } from 'react';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { EyeOff, Eye, ChevronDown, ChevronRight } from 'lucide-react';
import { useBillStore } from '@/store/billStore';
import { BlockItem } from './BlockItem';
import { BlockAdder } from './BlockAdder';
import { Button } from '@/components/ui/button';
import { BLOCK_LABELS, BLOCK_ICONS } from '@/features/bills/billUtils';
import type { Block } from '@/types/bill';

export function BlockEditor() {
  const { currentBill, reorderBlocks, updateBlockMeta } = useBillStore();
  const [activeBlock, setActiveBlock] = useState<Block | null>(null);
  const [showHidden, setShowHidden] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  if (!currentBill) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading editor...
      </div>
    );
  }

  const visibleBlocks = currentBill.blocks
    .filter((b) => b.visible)
    .sort((a, b) => a.order - b.order);

  const hiddenBlocks = currentBill.blocks
    .filter((b) => !b.visible)
    .sort((a, b) => a.order - b.order);

  function onDragStart(event: DragStartEvent) {
    const block = currentBill?.blocks.find((b) => b.id === event.active.id);
    setActiveBlock(block ?? null);
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveBlock(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const fromIndex = visibleBlocks.findIndex((b) => b.id === active.id);
    const toIndex = visibleBlocks.findIndex((b) => b.id === over.id);
    if (fromIndex >= 0 && toIndex >= 0) {
      reorderBlocks(fromIndex, toIndex);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={visibleBlocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {visibleBlocks.map((block) => (
              <BlockItem key={block.id} block={block} isDragging={activeBlock?.id === block.id} />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeBlock && (
            <div className="opacity-70 bg-background border-2 border-primary rounded-lg p-4 shadow-xl">
              <span className="text-sm font-medium text-muted-foreground">Moving block...</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Hidden blocks section */}
      {hiddenBlocks.length > 0 && (
        <div className="mt-4">
          <button
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-1"
            onClick={() => setShowHidden((v) => !v)}
          >
            {showHidden ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <EyeOff className="h-3.5 w-3.5" />
            <span>{hiddenBlocks.length} hidden block{hiddenBlocks.length > 1 ? 's' : ''}</span>
          </button>

          {showHidden && (
            <div className="mt-2 space-y-1.5 pl-4 border-l-2 border-dashed border-muted-foreground/30">
              {hiddenBlocks.map((block) => (
                <div key={block.id} className="flex items-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-2">
                  <span className="text-sm">{BLOCK_ICONS[block.type]}</span>
                  <span className="text-sm text-muted-foreground flex-1">{BLOCK_LABELS[block.type]}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => updateBlockMeta(block.id, { visible: true })}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Show
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        <BlockAdder />
      </div>
    </div>
  );
}
