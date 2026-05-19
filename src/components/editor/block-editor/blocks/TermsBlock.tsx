'use client';
import { useCallback } from 'react';
import { useBillStore } from '@/store/billStore';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { Block, TermsData } from '@/types/bill';

interface Props { block: Block & { type: 'terms' } }

export function TermsBlock({ block }: Props) {
  const { updateBlock } = useBillStore();
  const d = block.data;

  const update = useCallback((patch: Partial<TermsData>) => {
    updateBlock(block.id, { ...d, ...patch });
  }, [block.id, d, updateBlock]);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs">Terms & Conditions</Label>
        <Textarea
          value={d.terms}
          onChange={(e) => update({ terms: e.target.value })}
          placeholder="Enter your terms and conditions..."
          rows={4}
          className="text-sm resize-none"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Notes (optional)</Label>
        <Textarea
          value={d.notes || ''}
          onChange={(e) => update({ notes: e.target.value })}
          placeholder="Additional notes for this bill..."
          rows={2}
          className="text-sm resize-none"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Declaration (optional)</Label>
        <Textarea
          value={d.declaration || ''}
          onChange={(e) => update({ declaration: e.target.value })}
          placeholder="We declare that this invoice shows the actual price of the goods described..."
          rows={2}
          className="text-sm resize-none"
        />
      </div>
    </div>
  );
}
