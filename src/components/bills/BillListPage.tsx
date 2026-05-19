'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PlusCircle, Search, FileText, Copy, Pencil, Trash2, Eye, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BillMeta, BillStatus, BillType } from '@/types/bill';
import { deleteBill, duplicateBill } from '@/features/bills/billApi';
import { BILL_TYPE_LABELS } from '@/features/bills/billUtils';
import { formatDistanceToNow } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  finalized: 'bg-blue-100 text-blue-800',
  sent: 'bg-purple-100 text-purple-800',
  paid: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export function BillListPage({ initialBills }: { initialBills: BillMeta[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filtered = initialBills.filter((b) => {
    const matchSearch =
      !search ||
      b.billNumber.toLowerCase().includes(search.toLowerCase()) ||
      (b.buyerName || '').toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || b.billType === filterType;
    const matchStatus = filterStatus === 'all' || b.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  async function handleDuplicate(id: string) {
    try {
      const newBill = await duplicateBill(id);
      toast.success('Bill duplicated — edit the copy to update fields');
      router.push(`/bills/${newBill.meta.id}`);
    } catch {
      toast.error('Failed to duplicate');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this bill permanently? This cannot be undone.')) return;
    try {
      await deleteBill(id);
      toast.success('Bill deleted');
      router.refresh();
    } catch {
      toast.error('Failed to delete');
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">All Bills</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} of {initialBills.length} bills</p>
        </div>
        <Link href="/bills/new">
          <Button className="gap-2"><PlusCircle className="h-4 w-4" />New Bill</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by bill number or buyer..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={(v) => setFilterType(v ?? 'all')}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Bill type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(BILL_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {['draft', 'finalized', 'sent', 'paid', 'cancelled'].map((s) => (
              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bill list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
            <FileText className="h-12 w-12 opacity-20" />
            <p className="text-lg font-medium">No bills found</p>
            <p className="text-sm">{initialBills.length === 0 ? 'Create your first bill to get started' : 'Try adjusting your search or filters'}</p>
            {initialBills.length === 0 && <Link href="/bills/new"><Button>Create Bill</Button></Link>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((bill) => (
            <Card key={bill.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{bill.billNumber || 'Untitled Bill'}</span>
                      <Badge variant="outline" className="text-xs">{BILL_TYPE_LABELS[bill.billType]}</Badge>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[bill.status]}`}>
                        {bill.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      {bill.buyerName && <span className="font-medium text-foreground/70">{bill.buyerName}</span>}
                      <span>FY {bill.financialYear}</span>
                      <span>·</span>
                      <span>{formatDistanceToNow(new Date(bill.updatedAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  {bill.grandTotal != null && (
                    <span className="font-bold text-base">₹{bill.grandTotal.toLocaleString('en-IN')}</span>
                  )}
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Preview" onClick={() => router.push(`/bills/${bill.id}/preview`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => router.push(`/bills/${bill.id}`)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Duplicate" onClick={() => handleDuplicate(bill.id)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Delete" onClick={() => handleDelete(bill.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
