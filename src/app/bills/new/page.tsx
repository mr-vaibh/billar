import { redirectIfOrg } from '@/lib/orgRedirect';
import { EditorShell } from '@/components/editor/EditorShell';

export const dynamic = 'force-dynamic';

export default async function NewBillPage() {
  await redirectIfOrg('/bills/new');
  return <EditorShell billId={null} initialBill={null} />;
}
