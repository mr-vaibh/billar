'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface Props {
  orgId: string;
  currentStatus: string;
}

export function OrgStatusToggle({ orgId, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isSuspended = currentStatus === 'suspended';

  async function toggle() {
    if (!isSuspended) {
      const ok = confirm('Suspend this organisation? All users will be unable to log in.');
      if (!ok) return;
    }
    setLoading(true);
    await fetch(`/api/admin/orgs/${orgId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: isSuspended ? 'active' : 'suspended' }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <Button
      variant={isSuspended ? 'default' : 'outline'}
      size="sm"
      onClick={toggle}
      disabled={loading}
      className="text-xs h-7 px-2"
    >
      {loading ? '…' : isSuspended ? 'Activate' : 'Suspend'}
    </Button>
  );
}
