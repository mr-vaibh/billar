export interface PermissionGroup {
  label: string;
  permissions: { value: string; label: string }[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: 'Bill Creation',
    permissions: [
      { value: 'bills:create:invoice', label: 'Tax Invoice' },
      { value: 'bills:create:proforma', label: 'Proforma Invoice' },
      { value: 'bills:create:credit_note', label: 'Credit Note' },
      { value: 'bills:create:debit_note', label: 'Debit Note' },
      { value: 'bills:create:delivery_challan', label: 'Delivery Challan' },
      { value: 'bills:create:purchase_order', label: 'Purchase Order' },
      { value: 'bills:create:quotation', label: 'Quotation' },
    ],
  },
  {
    label: 'Bill Management',
    permissions: [
      { value: 'bills:read', label: 'View bills' },
      { value: 'bills:edit', label: 'Edit bills' },
      { value: 'bills:delete', label: 'Delete bills' },
    ],
  },
  {
    label: 'Masters (Companies & Accounts)',
    permissions: [
      { value: 'masters:read', label: 'View masters' },
      { value: 'masters:create', label: 'Add masters' },
      { value: 'masters:edit', label: 'Edit masters' },
      { value: 'masters:delete', label: 'Delete masters' },
    ],
  },
  {
    label: 'Templates',
    permissions: [
      { value: 'templates:read', label: 'View templates' },
      { value: 'templates:create', label: 'Create templates' },
      { value: 'templates:edit', label: 'Edit templates' },
      { value: 'templates:delete', label: 'Delete templates' },
    ],
  },
  {
    label: 'Settings',
    permissions: [
      { value: 'settings:read', label: 'View settings' },
      { value: 'settings:edit', label: 'Change settings' },
    ],
  },
  {
    label: 'User Management',
    permissions: [
      { value: 'users:read', label: 'View members' },
      { value: 'users:create', label: 'Invite members' },
      { value: 'users:edit', label: 'Edit members & roles' },
      { value: 'users:delete', label: 'Remove members' },
    ],
  },
  {
    label: 'Role Management',
    permissions: [
      { value: 'roles:read', label: 'View roles' },
      { value: 'roles:create', label: 'Create roles' },
      { value: 'roles:edit', label: 'Edit roles' },
      { value: 'roles:delete', label: 'Delete roles' },
    ],
  },
  {
    label: 'Organisation',
    permissions: [
      { value: 'org:delete', label: 'Delete organisation' },
    ],
  },
];
