import { CreateOrgForm } from '@/components/admin/CreateOrgForm';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function NewOrgPage() {
  return (
    <div className="max-w-lg space-y-6">
      <div>
        <Link href="/admin" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft className="h-4 w-4" /> Organisations
        </Link>
        <h1 className="text-2xl font-bold">New Organisation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Creates the organisation, seeds system roles, and sends an invite email to the first Owner.
        </p>
      </div>
      <CreateOrgForm />
    </div>
  );
}
