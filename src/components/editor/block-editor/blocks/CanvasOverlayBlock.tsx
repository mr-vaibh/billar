'use client';
import { useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useBillStore } from '@/store/billStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Block, CanvasOverlayData } from '@/types/bill';

const CanvasEditor = dynamic(() => import('@/components/editor/canvas-editor/CanvasEditor').then(m => ({ default: m.CanvasEditor })), {
  ssr: false,
  loading: () => <div className="h-48 flex items-center justify-center bg-muted/30 rounded text-muted-foreground text-sm">Loading canvas...</div>
});

interface Props { block: Block & { type: 'canvas_overlay' } }

export function CanvasOverlayBlock({ block }: Props) {
  const { updateBlock } = useBillStore();
  const d = block.data;

  const update = useCallback((patch: Partial<CanvasOverlayData>) => {
    updateBlock(block.id, { ...d, ...patch });
  }, [block.id, d, updateBlock]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="space-y-1 flex-1">
          <Label className="text-xs">Layer Label</Label>
          <Input value={d.label || ''} onChange={(e) => update({ label: e.target.value })} placeholder="Drawing Layer" className="h-8 text-sm" />
        </div>
        <div className="space-y-1 w-24">
          <Label className="text-xs">Height (px)</Label>
          <Input type="number" value={d.height} onChange={(e) => update({ height: parseInt(e.target.value) || 400 })} className="h-8 text-sm" min="100" max="2000" />
        </div>
      </div>
      <CanvasEditor
        fabricJson={d.fabricJson}
        width={794}
        height={d.height}
        onChange={(json) => update({ fabricJson: json })}
      />
    </div>
  );
}
