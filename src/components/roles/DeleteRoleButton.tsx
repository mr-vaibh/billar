'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

export function DeleteRoleButton({ orgId, roleId, roleName }: { orgId: string; roleId: string; roleName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete role "${roleName}"? Members with only this role will lose those permissions.`)) return;
    setLoading(true);
    const res = await fetch(`/api/orgs/${orgId}/roles/${roleId}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Role deleted'); router.refresh(); }
    else { const d = await res.json(); toast.error(d.error ?? 'Failed to delete role'); }
    setLoading(false);
  }

  return (
    <Button
      variant="ghost" size="sm"
      className="text-xs h-7 px-2 text-destructive hover:text-destructive"
      onClick={handleDelete} disabled={loading}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
