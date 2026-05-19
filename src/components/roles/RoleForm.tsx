'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { PERMISSION_GROUPS } from '@/lib/permissionGroups';

interface Props {
  orgId: string;
  roleId?: string;
  initial?: { name: string; description: string; permissions: string[] };
  readOnly?: boolean;
}

export function RoleForm({ orgId, roleId, initial, readOnly = false }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [permissions, setPermissions] = useState<Set<string>>(new Set(initial?.permissions ?? []));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function togglePermission(value: string) {
    if (readOnly) return;
    setPermissions((prev) => {
      const next = new Set(prev);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
  }

  function toggleGroup(groupPerms: string[]) {
    if (readOnly) return;
    const allChecked = groupPerms.every((p) => permissions.has(p));
    setPermissions((prev) => {
      const next = new Set(prev);
      if (allChecked) groupPerms.forEach((p) => next.delete(p));
      else groupPerms.forEach((p) => next.add(p));
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const url = roleId ? `/api/orgs/${orgId}/roles/${roleId}` : `/api/orgs/${orgId}/roles`;
      const method = roleId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, permissions: [...permissions] }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Something went wrong'); return; }
      toast.success(roleId ? 'Role updated' : 'Role created');
      router.push(`/orgs/${orgId}/roles`);
      router.refresh();
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border rounded-xl p-5 bg-background space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="role-name">Role name</Label>
          <Input
            id="role-name" required value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Billing Manager"
            disabled={readOnly}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role-desc">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Textarea
            id="role-desc" value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this role for?"
            className="resize-none h-20"
            disabled={readOnly}
          />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold text-sm">Permissions</h2>
        <div className="space-y-3">
          {PERMISSION_GROUPS.map((group) => {
            const groupValues = group.permissions.map((p) => p.value);
            const checkedCount = groupValues.filter((v) => permissions.has(v)).length;
            const allChecked = checkedCount === groupValues.length;
            const someChecked = checkedCount > 0 && !allChecked;

            return (
              <div key={group.label} className="border rounded-xl overflow-hidden bg-background">
                <label className="flex items-center gap-3 px-4 py-3 bg-muted/40 cursor-pointer border-b">
                  <Checkbox
                    checked={allChecked}
                    data-state={someChecked ? 'indeterminate' : allChecked ? 'checked' : 'unchecked'}
                    onCheckedChange={() => toggleGroup(groupValues)}
                    disabled={readOnly}
                  />
                  <span className="font-medium text-sm">{group.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{checkedCount}/{groupValues.length}</span>
                </label>
                <div className="divide-y">
                  {group.permissions.map((perm) => (
                    <label key={perm.value} className={`flex items-center gap-3 px-4 py-2.5 ${!readOnly ? 'cursor-pointer hover:bg-muted/30' : ''}`}>
                      <Checkbox
                        checked={permissions.has(perm.value)}
                        onCheckedChange={() => togglePermission(perm.value)}
                        disabled={readOnly}
                      />
                      <span className="text-sm">{perm.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground font-mono">{perm.value}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!readOnly && (
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={() => router.push(`/orgs/${orgId}/roles`)}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving…' : roleId ? 'Update role' : 'Create role'}
          </Button>
        </div>
      )}
    </form>
  );
}
