import { readBill } from '@/lib/fileStorage';
import { BillPreviewPage } from '@/components/bills/BillPreviewPage';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bill = readBill(id);
  if (!bill) notFound();
  return <BillPreviewPage bill={bill} />;
}
