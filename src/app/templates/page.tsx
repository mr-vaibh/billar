import { AppShell } from '@/components/layout/AppShell';
import { listTemplates } from '@/lib/fileStorage';
import { TemplatesClient } from '@/components/templates/TemplatesClient';

export const dynamic = 'force-dynamic';

export default function TemplatesPage() {
  const templates = listTemplates();
  return (
    <AppShell>
      <TemplatesClient initialTemplates={templates} />
    </AppShell>
  );
}
