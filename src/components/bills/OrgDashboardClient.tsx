'use client';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, Wallet, Clock, AlertCircle, FileText, PlusCircle } from 'lucide-react';
import { BILL_TYPE_LABELS } from '@/features/bills/billUtils';
import type { BillType } from '@/types/bill';

interface RecentBill {
  id: string; billNumber: string; billType: string; status: string;
  buyerName: string | null; grandTotal: number | null; createdAt: string;
}

interface Metrics {
  totalBilledThisMonth: number;
  collectedThisMonth: number;
  outstanding: number;
  overdue: number;
}

interface Props {
  orgId: string;
  metrics: Metrics;
  recentBills: RecentBill[];
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  finalized: 'bg-blue-100 text-blue-800',
  sent: 'bg-purple-100 text-purple-800',
  paid: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export function OrgDashboardClient({ orgId, metrics, recentBills }: Props) {
  const cards = [
    {
      label: 'Billed This Month',
      value: fmt(metrics.totalBilledThisMonth),
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Collected This Month',
      value: fmt(metrics.collectedThisMonth),
      icon: Wallet,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Outstanding',
      value: fmt(metrics.outstanding),
      icon: Clock,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      label: 'Overdue',
      value: fmt(metrics.overdue),
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview for {new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}</p>
        </div>
        <Link href={`/orgs/${orgId}/bills/new`}>
          <Button size="sm" className="gap-1.5">
            <PlusCircle className="h-4 w-4" />New Bill
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="border rounded-xl p-4 space-y-2">
            <div className={`inline-flex p-2 rounded-lg ${bg}`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="border rounded-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />Recent Bills
          </h2>
          <Link href={`/orgs/${orgId}/bills`}>
            <Button variant="ghost" size="sm" className="text-xs">View all</Button>
          </Link>
        </div>
        {recentBills.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            No bills yet. <Link href={`/orgs/${orgId}/bills/new`} className="underline">Create your first bill</Link>.
          </div>
        ) : (
          <div className="divide-y">
            {recentBills.map((b) => (
              <Link key={b.id} href={`/orgs/${orgId}/bills/${b.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm font-mono">{b.billNumber || '—'}</span>
                    <span className="text-xs text-muted-foreground">{BILL_TYPE_LABELS[b.billType as BillType] ?? b.billType}</span>
                  </div>
                  {b.buyerName && <p className="text-xs text-muted-foreground mt-0.5 truncate">{b.buyerName}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {b.grandTotal != null && (
                    <span className="font-mono text-sm font-medium">₹{b.grandTotal.toFixed(2)}</span>
                  )}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-800'}`}>
                    {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(b.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
