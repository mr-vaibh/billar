import { cache } from 'react';
import { db } from './db';

// ─── Canonical permission strings ─────────────────────────────────────────────

export const PERMISSIONS = {
  // Bills — create per type
  BILLS_CREATE_INVOICE: 'bills:create:invoice',
  BILLS_CREATE_PROFORMA: 'bills:create:proforma',
  BILLS_CREATE_CREDIT_NOTE: 'bills:create:credit_note',
  BILLS_CREATE_DEBIT_NOTE: 'bills:create:debit_note',
  BILLS_CREATE_DELIVERY_CHALLAN: 'bills:create:delivery_challan',
  BILLS_CREATE_PURCHASE_ORDER: 'bills:create:purchase_order',
  BILLS_CREATE_QUOTATION: 'bills:create:quotation',
  // Bills — CRUD
  BILLS_READ: 'bills:read',
  BILLS_EDIT: 'bills:edit',
  BILLS_DELETE: 'bills:delete',
  // Masters
  MASTERS_CREATE: 'masters:create',
  MASTERS_READ: 'masters:read',
  MASTERS_EDIT: 'masters:edit',
  MASTERS_DELETE: 'masters:delete',
  // Templates
  TEMPLATES_CREATE: 'templates:create',
  TEMPLATES_READ: 'templates:read',
  TEMPLATES_EDIT: 'templates:edit',
  TEMPLATES_DELETE: 'templates:delete',
  // Settings
  SETTINGS_READ: 'settings:read',
  SETTINGS_EDIT: 'settings:edit',
  // Users
  USERS_CREATE: 'users:create',
  USERS_READ: 'users:read',
  USERS_EDIT: 'users:edit',
  USERS_DELETE: 'users:delete',
  // Roles
  ROLES_CREATE: 'roles:create',
  ROLES_READ: 'roles:read',
  ROLES_EDIT: 'roles:edit',
  ROLES_DELETE: 'roles:delete',
  // Org
  ORG_DELETE: 'org:delete',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

// System role permission sets
export const SYSTEM_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  Owner: ALL_PERMISSIONS as Permission[],
  Admin: ALL_PERMISSIONS.filter((p) => p !== PERMISSIONS.ORG_DELETE) as Permission[],
  Accountant: [
    PERMISSIONS.BILLS_CREATE_INVOICE,
    PERMISSIONS.BILLS_CREATE_PROFORMA,
    PERMISSIONS.BILLS_CREATE_CREDIT_NOTE,
    PERMISSIONS.BILLS_CREATE_DEBIT_NOTE,
    PERMISSIONS.BILLS_CREATE_DELIVERY_CHALLAN,
    PERMISSIONS.BILLS_CREATE_PURCHASE_ORDER,
    PERMISSIONS.BILLS_CREATE_QUOTATION,
    PERMISSIONS.BILLS_READ,
    PERMISSIONS.BILLS_EDIT,
    PERMISSIONS.MASTERS_READ,
    PERMISSIONS.TEMPLATES_READ,
  ],
  Viewer: [PERMISSIONS.BILLS_READ],
};

// ─── Permission resolution ────────────────────────────────────────────────────

// React cache() ensures this runs once per request regardless of how many times it's called
export const getPermissions = cache(async (userId: string, orgId: string): Promise<Set<string>> => {
  const membership = await db.orgMembership.findUnique({
    where: { orgId_userId: { orgId, userId } },
    include: {
      roleAssignments: {
        include: {
          role: {
            include: { rolePermissions: true },
          },
        },
      },
    },
  });

  if (!membership || !membership.isActive) return new Set();

  const perms = new Set<string>();
  for (const assignment of membership.roleAssignments) {
    for (const rp of assignment.role.rolePermissions) {
      perms.add(rp.permission);
    }
  }
  return perms;
});

export function hasPermission(permissions: Set<string>, permission: string): boolean {
  return permissions.has(permission);
}

export async function requirePermission(
  userId: string,
  orgId: string,
  permission: string
): Promise<void> {
  const perms = await getPermissions(userId, orgId);
  if (!perms.has(permission)) {
    throw new PermissionError(permission);
  }
}

export class PermissionError extends Error {
  status = 403;
  constructor(permission: string) {
    super(`Missing permission: ${permission}`);
  }
}

// Helper for API routes — returns 403 Response on failure
export async function checkPermission(
  userId: string,
  orgId: string,
  permission: string
): Promise<Response | null> {
  const perms = await getPermissions(userId, orgId);
  if (!perms.has(permission)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}
