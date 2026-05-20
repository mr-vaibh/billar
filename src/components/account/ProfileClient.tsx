'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';

interface Props {
  user: { id: string; name: string; email: string; createdAt: string };
}

interface DeletePreview {
  willDeleteOrg: boolean;
  orgName?: string;
  canDelete?: boolean;
}

export function ProfileClient({ user }: Props) {
  const router = useRouter();

  const [name, setName] = useState(user.name);
  const [savingName, setSavingName] = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState('');

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [preview, setPreview] = useState<DeletePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const nameDirty = name !== user.name;

  async function handleSaveName() {
    if (!nameDirty) return;
    setSavingName(true);
    const res = await fetch('/api/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setSavingName(false);
    if (res.ok) toast.success('Name updated');
    else { const d = await res.json(); toast.error(d.error || 'Failed'); }
  }

  async function handleSavePassword() {
    setPwError('');
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return; }
    if (newPw.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    setSavingPw(true);
    const res = await fetch('/api/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    });
    const data = await res.json();
    setSavingPw(false);
    if (res.ok) {
      toast.success('Password changed');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } else {
      setPwError(data.error || 'Failed');
    }
  }

  async function openDeleteDialog() {
    setDeleteOpen(true);
    setPreview(null);
    setConfirmText('');
    setLoadingPreview(true);
    const res = await fetch('/api/account/delete-preview');
    const data = await res.json();
    setPreview(data);
    setLoadingPreview(false);
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    const res = await fetch('/api/account', { method: 'DELETE' });
    const data = await res.json();
    setDeleting(false);
    if (res.ok) {
      toast.success('Account deleted');
      router.push('/login');
    } else {
      toast.error(data.error || 'Failed to delete account');
      setDeleteOpen(false);
    }
  }

  const blocked = preview?.willDeleteOrg && !preview.canDelete;
  const canProceed = !blocked && confirmText === 'DELETE';

  return (
    <div className="space-y-10 max-w-lg">
      {/* Profile info */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Profile</h2>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={user.email} readOnly className="bg-muted cursor-not-allowed" />
          <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name">Display Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </div>
        <p className="text-xs text-muted-foreground">
          Member since {new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <Button onClick={handleSaveName} disabled={!nameDirty || savingName}>
          {savingName ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Saving…</> : 'Save Name'}
        </Button>
      </section>

      <Separator />

      {/* Change password */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Change Password</h2>
        {pwError && <Alert variant="destructive">{pwError}</Alert>}
        <div className="space-y-1.5">
          <Label htmlFor="currentPw">Current Password</Label>
          <Input id="currentPw" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="newPw">New Password</Label>
          <Input id="newPw" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Min. 8 characters" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPw">Confirm New Password</Label>
          <Input id="confirmPw" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
        </div>
        <Button onClick={handleSavePassword} disabled={!currentPw || !newPw || !confirmPw || savingPw}>
          {savingPw ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Saving…</> : 'Change Password'}
        </Button>
      </section>

      <Separator />

      {/* Danger zone */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-destructive uppercase tracking-wider">Danger Zone</h2>
        <div className="border border-destructive/30 rounded-lg p-4 space-y-3">
          <div>
            <p className="font-medium text-sm">Delete Account</p>
            <p className="text-xs text-muted-foreground mt-0.5">Permanently removes your account. This cannot be undone.</p>
          </div>
          <Button variant="destructive" size="sm" className="gap-1.5" onClick={openDeleteDialog}>
            <Trash2 className="h-3.5 w-3.5" />Delete my account
          </Button>
        </div>
      </section>

      <Dialog open={deleteOpen} onOpenChange={(o) => !o && setDeleteOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Account</DialogTitle>
          </DialogHeader>

          {loadingPreview ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {preview?.willDeleteOrg && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                  <div className="text-sm text-orange-800">
                    <p className="font-medium">This will also delete the organization <em>{preview.orgName}</em></p>
                    <p className="text-xs mt-0.5">You are the only remaining member.</p>
                  </div>
                </div>
              )}

              {blocked && (
                <Alert variant="destructive">
                  You need the <strong>org:delete</strong> permission to delete <em>{preview?.orgName}</em> along with your account. Ask an owner to grant it or remove you from the org first.
                </Alert>
              )}

              {!blocked && (
                <>
                  <p className="text-sm text-muted-foreground">
                    This is <strong>permanent and irreversible</strong>. Type <strong>DELETE</strong> to confirm.
                  </p>
                  <Input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    className="font-mono"
                  />
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            {!blocked && !loadingPreview && (
              <Button variant="destructive" disabled={!canProceed || deleting} onClick={handleDeleteAccount}>
                {deleting ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Deleting…</> : 'Delete Account'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
