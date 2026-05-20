'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface Props {
  orgId: string;
  currentStatus: string;
}

export function OrgStatusToggle({ orgId, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const isSuspended = currentStatus === 'suspended';

  async function toggle() {
    setLoading(true);
    await fetch(`/api/admin/orgs/${orgId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: isSuspended ? 'active' : 'suspended' }),
    });
    router.refresh();
    setLoading(false);
    setOpen(false);
  }

  function handleClick() {
    if (!isSuspended) { setOpen(true); return; }
    toggle();
  }

  return (
    <>
      <Button
        variant={isSuspended ? 'default' : 'outline'}
        size="sm"
        onClick={handleClick}
        disabled={loading}
        className="text-xs h-7 px-2"
      >
        {loading ? '…' : isSuspended ? 'Activate' : 'Suspend'}
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={toggle}
        title="Suspend organisation?"
        description="All users will be unable to log in until the organisation is reactivated."
        confirmLabel="Suspend"
        loading={loading}
      />
    </>
  );
}
