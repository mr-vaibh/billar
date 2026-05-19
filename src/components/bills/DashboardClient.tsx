'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PlusCircle, FileText, TrendingUp, Clock, CheckCircle2, Copy, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { BillMeta } from '@/types/bill';
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

interface Props {
  stats: { totalBills: number; draftCount: number; finalizedCount: number; totalRevenue: number };
  recentBills: BillMeta[];
}

export function DashboardClient({ stats, recentBills }: Props) {
  const router = useRouter();

  async function handleDuplicate(id: string) {
    try {
      const newBill = await duplicateBill(id);
      toast.success('Bill duplicated');
      router.push(`/bills/${newBill.meta.id}`);
    } catch {
      toast.error('Failed to duplicate');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this bill permanently?')) return;
    try {
      await deleteBill(id);
      toast.success('Bill deleted');
      router.refresh();
    } catch {
      toast.error('Failed to delete');
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Manage your bills and invoices</p>
        </div>
        <Link href="/bills/new">
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" />
            New Bill
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Total Bills" value={stats.totalBills} color="text-blue-600" />
        <StatCard icon={Clock} label="Drafts" value={stats.draftCount} color="text-yellow-600" />
        <StatCard icon={CheckCircle2} label="Finalized" value={stats.finalizedCount} color="text-green-600" />
        <StatCard icon={TrendingUp} label="Total Revenue" value={`₹${stats.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} color="text-purple-600" />
      </div>

      {/* Recent Bills */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Recent Bills</CardTitle>
          <Link href="/bills" className="text-sm text-primary hover:underline">View all</Link>
        </CardHeader>
        <CardContent className="p-0">
          {recentBills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
              <FileText className="h-10 w-10 opacity-30" />
              <p>No bills yet. Create your first bill!</p>
              <Link href="/bills/new"><Button variant="outline" size="sm">Create Bill</Button></Link>
            </div>
          ) : (
            <div className="divide-y">
              {recentBills.map((bill) => (
                <div key={bill.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{bill.billNumber || 'Untitled'}</span>
                        <Badge variant="outline" className="text-xs shrink-0">{BILL_TYPE_LABELS[bill.billType] || bill.billType}</Badge>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[bill.status] || 'bg-gray-100'}`}>
                          {bill.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {bill.buyerName && <span className="truncate">{bill.buyerName}</span>}
                        <span>{formatDistanceToNow(new Date(bill.updatedAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {bill.grandTotal != null && (
                      <span className="font-semibold text-sm">₹{bill.grandTotal.toLocaleString('en-IN')}</span>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => router.push(`/bills/${bill.id}`)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDuplicate(bill.id)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(bill.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; color: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="p-2 rounded-lg bg-muted">
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
