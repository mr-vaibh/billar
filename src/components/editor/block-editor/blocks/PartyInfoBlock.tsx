'use client';
import { useCallback, useState, useRef, useEffect } from 'react';
import { useBillStore } from '@/store/billStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Block, PartyDetails, PartyInfoData } from '@/types/bill';
import { INDIAN_STATES } from '@/features/bills/billUtils';

interface Props { block: Block & { type: 'party_info' } }

interface CustomerSuggestion {
  id: string; name: string; gstin: string | null; address: string | null;
  city: string | null; state: string | null; pincode: string | null;
  phone: string | null; email: string | null;
}

function PartyForm({
  label, party, onChange, showAutofill, orgId,
}: {
  label: string;
  party: PartyDetails;
  onChange: (p: Partial<PartyDetails>) => void;
  showAutofill?: boolean;
  orgId?: string;
}) {
  const [suggestions, setSuggestions] = useState<CustomerSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleNameChange(name: string) {
    onChange({ name });
    if (!showAutofill || !orgId || name.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(async () => {
      const res = await fetch(`/api/orgs/${orgId}/customers/search?q=${encodeURIComponent(name)}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
        setShowDropdown(data.length > 0);
      }
    }, 250);
  }

  function fillFromCustomer(c: CustomerSuggestion) {
    const state = INDIAN_STATES.find((s) => s.name === c.state || s.code === c.state);
    onChange({
      name: c.name,
      gstin: c.gstin ?? '',
      address: c.address ?? '',
      city: c.city ?? '',
      state: state?.name ?? c.state ?? '',
      stateCode: state?.code ?? '',
      pincode: c.pincode ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
    });
    setSuggestions([]);
    setShowDropdown(false);
  }

  return (
    <div className="flex-1 min-w-0 space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</h4>
      <div className="space-y-1" ref={showAutofill ? wrapRef : undefined}>
        <Label className="text-xs">Name *</Label>
        <div className="relative">
          <Input
            value={party.name}
            onChange={(e) => handleNameChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            placeholder="Company / Person Name"
          />
          {showDropdown && suggestions.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-auto">
              {suggestions.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                  onMouseDown={() => fillFromCustomer(c)}
                >
                  <span className="font-medium">{c.name}</span>
                  {c.gstin && <span className="ml-2 text-xs text-muted-foreground font-mono">{c.gstin}</span>}
                  {(c.city || c.state) && (
                    <span className="block text-xs text-muted-foreground">{[c.city, c.state].filter(Boolean).join(', ')}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Address</Label>
        <Input value={party.address} onChange={(e) => onChange({ address: e.target.value })} placeholder="Street address" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">City</Label>
          <Input value={party.city} onChange={(e) => onChange({ city: e.target.value })} placeholder="City" />
        </div>
        <div className="space-y-1 col-span-2">
          <Label className="text-xs">State</Label>
          <Select value={party.stateCode || ''} onValueChange={(v) => { if (!v) return;
            const state = INDIAN_STATES.find((s) => s.code === v);
            onChange({ stateCode: v, state: state?.name || '' });
          }}>
            <SelectTrigger className="text-xs h-9">
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {INDIAN_STATES.map((s) => <SelectItem key={s.code} value={s.code} className="text-xs">{s.code} - {s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">PIN Code</Label>
          <Input value={party.pincode} onChange={(e) => onChange({ pincode: e.target.value })} placeholder="400001" maxLength={6} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">GSTIN</Label>
          <Input value={party.gstin || ''} onChange={(e) => onChange({ gstin: e.target.value.toUpperCase() })} placeholder="GSTIN (optional)" maxLength={15} className="font-mono text-xs" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Phone</Label>
          <Input value={party.phone || ''} onChange={(e) => onChange({ phone: e.target.value })} placeholder="+91 98765 43210" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Email</Label>
          <Input type="email" value={party.email || ''} onChange={(e) => onChange({ email: e.target.value })} placeholder="contact@company.com" />
        </div>
      </div>
    </div>
  );
}

export function PartyInfoBlock({ block }: Props) {
  const { updateBlock, orgId } = useBillStore();
  const d = block.data;

  const update = useCallback((patch: Partial<PartyInfoData>) => {
    updateBlock(block.id, { ...d, ...patch });
  }, [block.id, d, updateBlock]);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <PartyForm
        label="Seller (From)"
        party={d.seller}
        onChange={(p) => update({ seller: { ...d.seller, ...p } })}
      />
      <div className="border-l hidden lg:block" />
      <PartyForm
        label="Buyer (To)"
        party={d.buyer}
        onChange={(p) => update({ buyer: { ...d.buyer, ...p } })}
        showAutofill
        orgId={orgId ?? undefined}
      />
    </div>
  );
}
