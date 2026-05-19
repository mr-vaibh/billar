'use client';
import { useCallback, useState, useEffect } from 'react';
import { useBillStore } from '@/store/billStore';
import { useOrgSafe } from '@/components/layout/OrgProvider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Block, CompanyHeaderData } from '@/types/bill';
import { Building2, Loader2 } from 'lucide-react';

interface CompanyOption {
  id: string; name: string; gstin: string | null; pan: string | null; cin: string | null;
  tagline: string | null; address: string; city: string; state: string; pincode: string;
  phone: string | null; email: string | null; website: string | null; logoBase64: string | null;
}

interface Props { block: Block & { type: 'company_header' } }

export function CompanyHeaderBlock({ block }: Props) {
  const { updateBlock, updateBillMeta, currentBill } = useBillStore();
  const org = useOrgSafe();
  const d = block.data;
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companiesLoaded, setCompaniesLoaded] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [allowOverride, setAllowOverride] = useState(true);

  const update = useCallback((patch: Partial<CompanyHeaderData>) => {
    updateBlock(block.id, { ...d, ...patch });
  }, [block.id, d, updateBlock]);

  useEffect(() => {
    if (!org || companiesLoaded) return;
    setLoadingCompanies(true);
    fetch(`/api/orgs/${org.orgId}/companies`)
      .then((r) => r.json())
      .then((data) => {
        const active = data.filter((c: { isActive: boolean }) => c.isActive);
        setCompanies(active);
        setCompaniesLoaded(true);
        // Restore selected name from saved bill meta on refresh
        const savedId = currentBill?.meta?.companyId;
        if (savedId) {
          const match = active.find((c: CompanyOption) => c.id === savedId);
          if (match) setSelectedName(match.name);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCompanies(false));
  }, [org?.orgId]); // eslint-disable-line

  useEffect(() => {
    if (!org) return;
    fetch(`/api/orgs/${org.orgId}/settings`)
      .then((r) => r.json())
      .then((s) => setAllowOverride(s.allowCompanyOverride ?? true))
      .catch(() => {});
  }, [org?.orgId]); // eslint-disable-line

  function fillFromCompany(companyId: string) {
    const c = companies.find((c) => c.id === companyId);
    if (!c) return;
    setSelectedName(c.name);
    updateBlock(block.id, {
      ...d,
      companyName: c.name,
      tagline: c.tagline ?? '',
      address: c.address,
      city: c.city,
      state: c.state,
      pincode: c.pincode,
      phone: c.phone ?? '',
      email: c.email ?? '',
      website: c.website ?? '',
      gstin: c.gstin ?? '',
      pan: c.pan ?? '',
      cin: c.cin ?? '',
      logo: c.logoBase64 ?? undefined,
    });
    updateBillMeta({ companyId });
  }

  const hasSelectedCompany = selectedName !== null || !!currentBill?.meta?.companyId;
  const readOnly = !allowOverride && hasSelectedCompany;
  const inputClass = readOnly ? 'bg-muted cursor-not-allowed' : '';

  return (
    <div className="space-y-4">
      {org && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md border border-dashed">
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground flex-1">Fill from company master</span>
          <Select onValueChange={(v) => { if (typeof v === 'string') fillFromCompany(v); }}>
            <SelectTrigger className="h-7 w-52 text-xs">
              {loadingCompanies ? (
                <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Loading…</span>
              ) : selectedName ? (
                <span>{selectedName}</span>
              ) : (
                <SelectValue placeholder="Pick a company…" />
              )}
            </SelectTrigger>
            <SelectContent>
              {companies.length === 0 && companiesLoaded && (
                <SelectItem value="__none__" disabled>No active companies</SelectItem>
              )}
              {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Company Name *</Label>
          <Input value={d.companyName} onChange={(e) => update({ companyName: e.target.value })} placeholder="Your Company Pvt. Ltd." readOnly={readOnly} className={inputClass} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Tagline</Label>
          <Input value={d.tagline || ''} onChange={(e) => update({ tagline: e.target.value })} placeholder="Your trusted partner" readOnly={readOnly} className={inputClass} />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Address *</Label>
        <Input value={d.address} onChange={(e) => update({ address: e.target.value })} placeholder="123, Main Street, Area" readOnly={readOnly} className={inputClass} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">City *</Label>
          <Input value={d.city} onChange={(e) => update({ city: e.target.value })} placeholder="Mumbai" readOnly={readOnly} className={inputClass} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">State *</Label>
          <Input value={d.state} onChange={(e) => update({ state: e.target.value })} placeholder="Maharashtra" readOnly={readOnly} className={inputClass} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">PIN Code *</Label>
          <Input value={d.pincode} onChange={(e) => update({ pincode: e.target.value })} placeholder="400001" maxLength={6} readOnly={readOnly} className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Phone *</Label>
          <Input value={d.phone} onChange={(e) => update({ phone: e.target.value })} placeholder="+91 98765 43210" readOnly={readOnly} className={inputClass} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Email *</Label>
          <Input type="email" value={d.email} onChange={(e) => update({ email: e.target.value })} placeholder="info@company.com" readOnly={readOnly} className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">GSTIN *</Label>
          <Input value={d.gstin} onChange={(e) => update({ gstin: e.target.value.toUpperCase() })} placeholder="22AAAAA0000A1Z5" maxLength={15} readOnly={readOnly} className={cn('font-mono text-xs', inputClass)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">PAN *</Label>
          <Input value={d.pan} onChange={(e) => update({ pan: e.target.value.toUpperCase() })} placeholder="AAAAA0000A" maxLength={10} readOnly={readOnly} className={cn('font-mono text-xs', inputClass)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">CIN (optional)</Label>
          <Input value={d.cin || ''} onChange={(e) => update({ cin: e.target.value.toUpperCase() })} placeholder="U12345MH2000PTC000000" readOnly={readOnly} className={cn('font-mono text-xs', inputClass)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Website (optional)</Label>
        <Input value={d.website || ''} onChange={(e) => update({ website: e.target.value })} placeholder="https://www.yourcompany.com" readOnly={readOnly} className={inputClass} />
      </div>
    </div>
  );
}
