'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

interface Role { id: string; name: string; isSystem: boolean }
interface Member {
  userId: string; email: string; name: string; isActive: boolean;
  joinedAt: string; roles: Role[];
}

interface Props {
  orgId: string;
  currentUserId: string;
  members: Member[];
  allRoles: Role[];
  canInvite: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export function UsersClient({ orgId, currentUserId, members: initial, allRoles, canInvite, canEdit, canDelete }: Props) {
  const router = useRouter();
  const [members, setMembers] = useState(initial);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);

  async function refresh() {
    router.refresh();
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>
        {canInvite && (
          <Button className="gap-2" onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4" /> Invite member
          </Button>
        )}
      </div>

      {members.length === 0 ? (
        <div className="border rounded-xl p-12 text-center text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No members yet</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-background">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Roles</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
                {(canEdit || canDelete) && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y">
              {members.map((m) => (
                <tr key={m.userId} className={`hover:bg-muted/20 transition-colors ${!m.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium">
                    {m.name}
                    {m.userId === currentUserId && (
                      <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                    )}
                    {!m.isActive && (
                      <Badge variant="outline" className="ml-2 text-xs">Inactive</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {m.roles.map((r) => (
                        <Badge key={r.id} variant={r.isSystem ? 'default' : 'secondary'} className="text-xs">
                          {r.name}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(m.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  {(canEdit || canDelete) && m.userId !== currentUserId && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        {canEdit && (
                          <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => setEditMember(m)}>
                            Edit roles
                          </Button>
                        )}
                        {canDelete && (
                          <RemoveMemberButton orgId={orgId} userId={m.userId} name={m.name} onDone={refresh} />
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canInvite && (
        <InviteDialog
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          orgId={orgId}
          allRoles={allRoles}
          onDone={() => { setInviteOpen(false); refresh(); }}
        />
      )}

      {canEdit && editMember && (
        <EditRolesDialog
          open={!!editMember}
          member={editMember}
          orgId={orgId}
          allRoles={allRoles}
          onClose={() => setEditMember(null)}
          onDone={() => { setEditMember(null); refresh(); }}
        />
      )}
    </div>
  );
}

function RemoveMemberButton({ orgId, userId, name, onDone }: { orgId: string; userId: string; name: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function remove() {
    setLoading(true);
    const res = await fetch(`/api/orgs/${orgId}/users/${userId}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Member removed'); onDone(); }
    else { toast.error('Failed to remove member'); }
    setLoading(false);
    setOpen(false);
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-destructive hover:text-destructive" onClick={() => setOpen(true)} disabled={loading}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={remove}
        title="Remove member?"
        description={`${name} will be removed from this organisation and lose all access.`}
        confirmLabel="Remove"
        loading={loading}
      />
    </>
  );
}

function InviteDialog({ open, onClose, orgId, allRoles, onDone }: {
  open: boolean; onClose: () => void; orgId: string; allRoles: Role[]; onDone: () => void;
}) {
  const [email, setEmail] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function toggleRole(id: string) {
    setSelectedRoles((prev) => prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (selectedRoles.length === 0) { setError('Select at least one role'); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/orgs/${orgId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, roleIds: selectedRoles }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to send invite'); return; }
      toast.success(`Invite sent to ${email}`);
      onDone();
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="inv-email">Email address</Label>
            <Input id="inv-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@company.com" />
            <p className="text-xs text-muted-foreground">They'll receive an invite link to set up their account.</p>
          </div>
          <div className="space-y-2">
            <Label>Assign roles</Label>
            <div className="border rounded-lg divide-y">
              {allRoles.map((r) => (
                <label key={r.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/40">
                  <Checkbox
                    checked={selectedRoles.includes(r.id)}
                    onCheckedChange={() => toggleRole(r.id)}
                  />
                  <span className="text-sm font-medium">{r.name}</span>
                  {r.isSystem && <Badge variant="outline" className="text-xs ml-auto">System</Badge>}
                </label>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Sending…' : 'Send invite'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditRolesDialog({ open, member, orgId, allRoles, onClose, onDone }: {
  open: boolean; member: Member; orgId: string; allRoles: Role[];
  onClose: () => void; onDone: () => void;
}) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(member.roles.map((r) => r.id));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function toggleRole(id: string) {
    setSelectedRoles((prev) => prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (selectedRoles.length === 0) { setError('At least one role required'); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/orgs/${orgId}/users/${member.userId}/roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleIds: selectedRoles }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed'); return; }
      toast.success('Roles updated');
      onDone();
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit roles — {member.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="border rounded-lg divide-y">
            {allRoles.map((r) => (
              <label key={r.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/40">
                <Checkbox
                  checked={selectedRoles.includes(r.id)}
                  onCheckedChange={() => toggleRole(r.id)}
                />
                <span className="text-sm font-medium">{r.name}</span>
                {r.isSystem && <Badge variant="outline" className="text-xs ml-auto">System</Badge>}
              </label>
            ))}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save roles'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
