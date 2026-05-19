'use client';
import { useCallback, useRef } from 'react';
import { useBillStore } from '@/store/billStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Upload, Trash2 } from 'lucide-react';
import type { Block, SignatureData } from '@/types/bill';

interface Props { block: Block & { type: 'signature' } }

export function SignatureBlock({ block }: Props) {
  const { updateBlock } = useBillStore();
  const d = block.data;
  const sigFileRef = useRef<HTMLInputElement>(null);
  const stampFileRef = useRef<HTMLInputElement>(null);

  const update = useCallback((patch: Partial<SignatureData>) => {
    updateBlock(block.id, { ...d, ...patch });
  }, [block.id, d, updateBlock]);

  function handleImageUpload(field: 'signatureImage' | 'companyStamp', file: File) {
    const reader = new FileReader();
    reader.onload = (e) => update({ [field]: e.target?.result as string });
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Signatory Name *</Label>
          <Input value={d.signatoryName} onChange={(e) => update({ signatoryName: e.target.value })} placeholder="Full name" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Designation</Label>
          <Input value={d.designation || ''} onChange={(e) => update({ designation: e.target.value })} placeholder="Authorised Signatory" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Signature upload */}
        <div className="space-y-2">
          <Label className="text-xs">Signature Image</Label>
          <input type="file" ref={sigFileRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload('signatureImage', e.target.files[0])} />
          {d.signatureImage ? (
            <div className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.signatureImage} alt="Signature" className="h-16 object-contain border rounded bg-white p-1" />
              <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 bg-background text-destructive" onClick={() => update({ signatureImage: undefined })}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="gap-1.5 w-full" onClick={() => sigFileRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" />Upload Signature
            </Button>
          )}
        </div>

        {/* Stamp upload */}
        <div className="space-y-2">
          <Label className="text-xs">Company Stamp (optional)</Label>
          <input type="file" ref={stampFileRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload('companyStamp', e.target.files[0])} />
          {d.companyStamp ? (
            <div className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.companyStamp} alt="Stamp" className="h-16 object-contain border rounded bg-white p-1" />
              <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 bg-background text-destructive" onClick={() => update({ companyStamp: undefined })}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="gap-1.5 w-full" onClick={() => stampFileRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" />Upload Stamp
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
