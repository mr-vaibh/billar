'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PlusCircle, Search, FileText, Copy, Pencil, Trash2, Eye, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { orgDeleteBill, orgDuplicateBill } from '@/features/bills/billApi';
import { BILL_TYPE_LABELS } from '@/features/bills/billUtils';
import { formatDistanceToNow } from 'date-fns';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

interface BillRow {
  id: string;
  billNumber: string;
  billType: string;
  status: string;
  financialYear: string;
  currency: string;
  buyerName?: string;
  grandTotal?: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface Props {
  orgId: string;
  initialBills: BillRow[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  finalized: 'bg-blue-100 text-blue-800',
  sent: 'bg-purple-100 text-purple-800',
  paid: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export function OrgBillListClient({ orgId, initialBills, canCreate, canEdit, canDelete }: Props) {
  const router = useRouter();
  const [bills, setBills] = useState(initialBills);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = bills.filter((b) => {
    const matchSearch = !search ||
      b.billNumber.toLowerCase().includes(search.toLowerCase()) ||
      (b.buyerName || '').toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || b.billType === filterType;
    const matchStatus = filterStatus === 'all' || b.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  async function handleDuplicate(id: string) {
    try {
      const newBill = await orgDuplicateBill(orgId, id);
      toast.success('Bill duplicated');
      router.push(`/orgs/${orgId}/bills/${newBill.meta.id}`);
    } catch {
      toast.error('Failed to duplicate');
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      await orgDeleteBill(orgId, id);
      setBills((prev) => prev.filter((b) => b.id !== id));
      setConfirmId(null);
      toast.success('Bill deleted');
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
    }
  }

  const confirmBill = bills.find((b) => b.id === confirmId);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bills</h1>
          <p className="text-sm text-muted-foreground mt-1">{bills.length} bill{bills.length !== 1 ? 's' : ''} total</p>
        </div>
        {canCreate && (
          <Link href={`/orgs/${orgId}/bills/new`}>
            <Button size="sm" className="gap-2">
              <PlusCircle className="h-4 w-4" />
              New Bill
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by number or buyer…"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={(v) => v && setFilterType(v)}>
          <SelectTrigger className="w-44">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(BILL_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => v && setFilterStatus(v)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {['draft', 'finalized', 'sent', 'paid', 'cancelled'].map((s) => (
              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <FileText className="h-10 w-10 opacity-30" />
          <p className="text-sm">{bills.length === 0 ? 'No bills yet.' : 'No bills match your filters.'}</p>
          {canCreate && bills.length === 0 && (
            <Link href={`/orgs/${orgId}/bills/new`}>
              <Button size="sm" variant="outline">Create your first bill</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium">Bill No.</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Buyer</th>
                <th className="text-left px-4 py-3 font-medium">Amount</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => router.push(`/orgs/${orgId}/bills/${b.id}`)}>
                  <td className="px-4 py-3 font-mono text-xs font-medium">{b.billNumber}</td>
                  <td className="px-4 py-3 text-muted-foreground">{(BILL_TYPE_LABELS as Record<string, string>)[b.billType] ?? b.billType}</td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-[160px]">{b.buyerName || '—'}</td>
                  <td className="px-4 py-3 font-medium">
                    {b.grandTotal != null ? `₹${b.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                    {formatDistanceToNow(new Date(b.updatedAt), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => router.push(`/orgs/${orgId}/bills/${b.id}/preview`)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {canEdit && (
                        <Button size="sm" variant="ghost" onClick={() => router.push(`/orgs/${orgId}/bills/${b.id}`)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" title="Duplicate" onClick={() => handleDuplicate(b.id)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      {canDelete && (
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmId(b.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!confirmId} onOpenChange={() => setConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete bill?</DialogTitle>
            <DialogDescription>
              Bill <strong>{confirmBill?.billNumber}</strong> will be permanently deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleting} onClick={() => confirmId && handleDelete(confirmId)}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
