import { readBill } from '@/lib/fileStorage';
import { EditorShell } from '@/components/editor/EditorShell';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function EditBillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bill = readBill(id);
  if (!bill) notFound();
  return <EditorShell billId={id} initialBill={bill} />;
}
