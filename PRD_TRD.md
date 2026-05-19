# Billar SaaS — PRD + TRD

**Version:** 1.0  
**Date:** 2026-05-19  
**Status:** Draft — awaiting answers to Open Questions before implementation begins

---

## Table of Contents

1. [What's Being Built](#1-whats-being-built)
2. [Current State](#2-current-state)
3. [Prisma Schema](#3-prisma-schema)
4. [Auth Design](#4-auth-design)
5. [RBAC Design](#5-rbac-design)
6. [Feature Specifications](#6-feature-specifications)
7. [API Routes](#7-api-routes)
8. [UI Pages & Flows](#8-ui-pages--flows)
9. [Implementation Phases](#9-implementation-phases)
10. [Data Migration](#10-data-migration)
11. [Open Questions](#11-open-questions)

---

## 1. What's Being Built

Billar evolves from a single-user local bill-maker to a multi-tenant SaaS. Each **Organization** is an isolated tenant. Users within an org operate under role-based permissions. All state moves from flat JSON files to PostgreSQL via Prisma. Auth is credentials-based (email + password) with server-side sessions stored in DB.

**No Python backend needed.** Next.js API routes handle everything.

---

## 2. Current State

| Concern | Current | Target |
|---|---|---|
| Storage | `bills/<id>.json`, `templates/<id>.json` | PostgreSQL via Prisma |
| Auth | None | Email + password, DB sessions |
| Multi-tenancy | None | Organization entity, all data scoped |
| Bill numbering | Manual field in `order_info` block | Auto-incrementing sequences per org + FY |
| Company info | Typed inline per bill | Company Master (pre-defined entities) |
| Bank details | Typed inline per bill | Financial Account Master, linked to Company |
| GST settings | Hardcoded | Org-level configurable defaults |
| RBAC | None | Roles + Permissions, fully configurable |

---

## 3. Prisma Schema

### 3.1 Enums

```prisma
enum BillType {
  invoice
  proforma
  credit_note
  debit_note
  delivery_challan
  purchase_order
  quotation
}

enum BillStatus {
  draft
  finalized
  sent
  paid
  cancelled
}

enum GstMode {
  cgst_sgst
  igst
}

enum AccountType {
  savings
  current
  cc
  od
}

enum OrgStatus {
  active
  suspended
  deleted
}
```

### 3.2 Core Identity Models

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  name          String
  isSuperAdmin  Boolean   @default(false)
  mustChangePassword Boolean @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  sessions      Session[]
  memberships   OrgMembership[]
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  orgId     String?  // active org context
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  ipAddress String?
  userAgent String?

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([token])
  @@index([userId])
}

model Organization {
  id          String    @id @default(cuid())
  name        String
  slug        String    @unique
  status      OrgStatus @default(active)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  memberships       OrgMembership[]
  roles             Role[]
  companies         Company[]
  financialAccounts FinancialAccount[]
  bills             Bill[]
  templates         Template[]
  settings          OrgSettings?
  invoiceSequences  InvoiceSequence[]
  auditLogs         AuditLog[]
}

model OrgMembership {
  id        String   @id @default(cuid())
  orgId     String
  userId    String
  createdAt DateTime @default(now())

  org             Organization           @relation(fields: [orgId], references: [id], onDelete: Cascade)
  user            User                   @relation(fields: [userId], references: [id], onDelete: Cascade)
  roleAssignments MemberRoleAssignment[]

  @@unique([orgId, userId])
  @@index([orgId])
  @@index([userId])
}
```

### 3.3 RBAC Models

```prisma
// Permissions are stored as strings, not an enum, to allow future extension.
// Seed with the canonical list on org creation.

model Role {
  id          String   @id @default(cuid())
  orgId       String
  name        String
  description String?
  isSystem    Boolean  @default(false) // system roles cannot be deleted
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  org               Organization           @relation(fields: [orgId], references: [id], onDelete: Cascade)
  rolePermissions   RolePermission[]
  memberAssignments MemberRoleAssignment[]

  @@unique([orgId, name])
  @@index([orgId])
}

model RolePermission {
  id         String @id @default(cuid())
  roleId     String
  permission String // e.g. "bills:create:invoice", "masters:read"

  role       Role   @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@unique([roleId, permission])
  @@index([roleId])
}

model MemberRoleAssignment {
  id           String   @id @default(cuid())
  membershipId String
  roleId       String
  assignedAt   DateTime @default(now())
  assignedBy   String?  // userId of assigner

  membership   OrgMembership @relation(fields: [membershipId], references: [id], onDelete: Cascade)
  role         Role          @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@unique([membershipId, roleId])
  @@index([membershipId])
  @@index([roleId])
}
```

### 3.4 Masters

```prisma
model Company {
  id        String   @id @default(cuid())
  orgId     String
  name      String
  gstin     String?
  pan       String?
  cin       String?
  tagline   String?
  address   String
  city      String
  state     String
  pincode   String
  phone     String?
  email     String?
  website   String?
  logoUrl   String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  org               Organization       @relation(fields: [orgId], references: [id], onDelete: Cascade)
  financialAccounts FinancialAccount[]
  bills             Bill[]

  @@index([orgId])
}

model FinancialAccount {
  id                String      @id @default(cuid())
  orgId             String
  companyId         String?     // nullable — can exist independently
  label             String      // user-given label e.g. "Main Current Account"
  bankName          String
  accountNumber     String
  ifscCode          String
  accountType       AccountType
  branchName        String
  accountHolderName String
  upiId             String?
  qrCodeImageUrl    String?
  isActive          Boolean     @default(true)
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  org     Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  company Company?     @relation(fields: [companyId], references: [id], onDelete: SetNull)

  @@index([orgId])
  @@index([companyId])
}
```

### 3.5 Org Settings

```prisma
model OrgSettings {
  id                   String   @id @default(cuid())
  orgId                String   @unique
  defaultGstMode       GstMode  @default(cgst_sgst)
  defaultIgstRate      Float    @default(18)
  defaultCgstRate      Float    @default(9)
  defaultSgstRate      Float    @default(9)
  allowCompanyOverride Boolean  @default(false)
  allowBankOverride    Boolean  @default(false)
  updatedAt            DateTime @updatedAt

  org Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
}
```

### 3.6 Invoice Sequences

```prisma
model InvoiceSequence {
  id            String   @id @default(cuid())
  orgId         String
  billType      BillType
  financialYear String   // "2025-26"
  prefix        String   @default("")
  typeCode      String   // INV, PRF, CN, DN, DC, PO, QT
  zeroPadding   Int      @default(4)
  currentValue  Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  org     Organization             @relation(fields: [orgId], references: [id], onDelete: Cascade)
  history InvoiceSequenceHistory[]

  @@unique([orgId, billType, financialYear])
  @@index([orgId])
}

model InvoiceSequenceHistory {
  id            String   @id @default(cuid())
  sequenceId    String
  previousValue Int
  newValue      Int
  reason        String
  performedBy   String   // userId
  performedAt   DateTime @default(now())

  sequence InvoiceSequence @relation(fields: [sequenceId], references: [id], onDelete: Cascade)

  @@index([sequenceId])
}
```

### 3.7 Bills & Templates

```prisma
model Bill {
  id               String     @id @default(cuid())
  orgId            String
  companyId        String?    // which company master was used
  legacyId         String?    // for flat-file migration
  billNumber       String
  billType         BillType
  status           BillStatus @default(draft)
  financialYear    String
  templateId       String?
  duplicatedFromId String?
  currency         String     @default("INR")
  buyerName        String?
  grandTotal       Float?
  tags             String[]
  blocksJson       Json
  globalCanvasJson Json?
  schemaVersion    Int        @default(1)
  createdBy        String     // userId
  updatedBy        String     // userId
  createdAt        DateTime   @default(now())
  updatedAt        DateTime   @updatedAt

  org     Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  company Company?     @relation(fields: [companyId], references: [id], onDelete: SetNull)

  @@unique([orgId, billNumber, financialYear])
  @@index([orgId])
  @@index([orgId, billType])
  @@index([orgId, status])
  @@index([createdBy])
}

model Template {
  id               String   @id @default(cuid())
  orgId            String
  legacyId         String?  // for flat-file migration
  name             String
  description      String?
  thumbnail        String?
  billType         BillType
  blocksJson       Json
  globalCanvasJson Json?
  isDefault        Boolean  @default(false)
  tags             String[]
  createdBy        String
  updatedBy        String
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  org Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([orgId])
  @@index([orgId, billType])
}
```

### 3.8 Audit Log

```prisma
model AuditLog {
  id         String   @id @default(cuid())
  orgId      String
  userId     String
  action     String   // "bill.delete", "role.assign", "sequence.reset", "org.suspend"
  resourceId String?
  meta       Json?    // before/after snapshot or relevant context
  createdAt  DateTime @default(now())

  org Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([orgId])
  @@index([orgId, userId])
  @@index([orgId, resourceId])
}
```

---

## 4. Auth Design

### Session Strategy

Custom implementation — no NextAuth.

- On login: bcrypt-compare password → create `Session` row with a random 32-byte hex `token` → set `HttpOnly; Secure; SameSite=Lax` cookie `billar_session=<token>` with `orgId` on the session row.
- On every request: middleware reads cookie → queries `Session JOIN User` where `token = ? AND expiresAt > NOW()`.
- Session TTL: 30 days, sliding (update `expiresAt` if < 7 days remaining to reduce DB writes).
- Logout: DELETE session row + clear cookie.
- Super admin routes additionally check `user.isSuperAdmin = true`.

### Middleware (`middleware.ts`)

Runs on every non-static request:
1. Read `billar_session` cookie.
2. If missing or expired → redirect to `/login` (exemptions: `/login`, `/admin/login`, `/api/auth/*`, public assets).
3. For org-scoped routes (`/orgs/[orgId]/*`): verify user is a member of that org.
4. For `/admin/*`: verify `user.isSuperAdmin = true`.

### Permission Resolution

```typescript
// src/lib/permissions.ts
// React cache() ensures this runs once per request, not per call
const getPermissions = cache(async (userId: string, orgId: string): Promise<Set<string>> => {
  // JOIN: OrgMembership → MemberRoleAssignment → Role → RolePermission
  // UNION all permission strings
})

async function requirePermission(userId: string, orgId: string, permission: string): Promise<void>
// throws 403 if permission not in set

function hasPermission(permissions: Set<string>, permission: string): boolean
```

---

## 5. RBAC Design

### Full Permission List

```
bills:create:invoice          bills:create:proforma
bills:create:credit_note      bills:create:debit_note
bills:create:delivery_challan bills:create:purchase_order
bills:create:quotation

bills:read    bills:edit    bills:delete

masters:create  masters:read  masters:edit  masters:delete

templates:create  templates:read  templates:edit  templates:delete

settings:read  settings:edit

users:create  users:read  users:edit  users:delete

roles:create  roles:read  roles:edit  roles:delete

org:delete
```

### System Roles (seeded per org, non-deletable)

| Role | Permissions |
|---|---|
| **Owner** | All permissions |
| **Admin** | All except `org:delete` |
| **Accountant** | `bills:create:*`, `bills:read`, `bills:edit`, `masters:read`, `templates:read` |
| **Viewer** | `bills:read` only |

Owner and Admin are non-editable. Accountant and Viewer permissions can be adjusted.

---

## 6. Feature Specifications

### 6.1 Company Master

**Data flow on bill creation:**

1. `company_header` block has a combobox "Select Company" at the top.
2. Options fetched from `/api/orgs/[orgId]/companies`.
3. A "＋ Add new company" option at the bottom of the combobox opens an inline `<Sheet>` (right-side drawer) with the full Company create form — no page navigation.
4. On company select: all `CompanyHeaderData` fields populate from the `Company` row.
5. If `allowCompanyOverride = false` (default): fields become read-only. A chip shows "Using: [Company Name]".
6. If `allowCompanyOverride = true`: a faint "Override mode" badge appears; fields stay editable for this bill only. The master is never mutated.
7. Bill stores `companyId` FK + a snapshot of data in `blocksJson`. Editing the master later does not affect past bills.

**Field mapping:**

| `Company` column | `CompanyHeaderData` field |
|---|---|
| name | companyName |
| logoUrl | logo |
| tagline | tagline |
| address | address |
| city | city |
| state | state |
| pincode | pincode |
| phone | phone |
| email | email |
| website | website |
| gstin | gstin |
| pan | pan |
| cin | cin |

### 6.2 Financial Accounts

- Standalone accounts are available org-wide in any bill's `bank_details` block.
- Accounts attached to a company auto-populate `bank_details` when that company is selected.
- If a company has multiple accounts: a secondary picker "Select bank account" appears within the block.
- `allowBankOverride` toggle mirrors `allowCompanyOverride` behavior.
- `BankDetailsData` maps 1:1 to `FinancialAccount` fields.
- Creating from company detail page (attached) and from standalone "Financial Accounts" master page are both supported.

### 6.3 Invoice Numbering

**Format:** `{prefix}/{FY_short}/{typeCode}/{zero_padded_number}`

Example: prefix=`ACM`, FY=`2526`, typeCode=`INV`, padding=4 → `ACM/2526/INV/0001`

**Default type codes:**

| BillType | typeCode |
|---|---|
| invoice | INV |
| proforma | PRF |
| credit_note | CN |
| debit_note | DN |
| delivery_challan | DC |
| purchase_order | PO |
| quotation | QT |

**Financial year calculation:**

```
month >= 4  →  FY = "{year}-{year+1}",  short = "{yy}{yy+1}"
month < 4   →  FY = "{year-1}-{year}",  short = "{yy-1}{yy}"

e.g. 2026-05-19  →  "2025-26", short "2526"
     2026-02-01  →  "2025-26", short "2526"
```

**Atomic number reservation:**

```sql
-- Inside a Prisma $transaction with Serializable isolation
SELECT current_value FROM "InvoiceSequence"
WHERE org_id = $1 AND bill_type = $2 AND financial_year = $3
FOR UPDATE;

UPDATE "InvoiceSequence"
SET current_value = current_value + 1, updated_at = NOW()
WHERE ...;
-- Return new value to caller
```

If no row exists for the (org, billType, FY) tuple, one is created automatically with `currentValue = 1`. This handles April 1 transitions naturally.

**Number lifecycle:**

- While bill is unsaved: editor shows preview `ACM/2526/INV/____`.
- On first save (draft creation): number is reserved atomically; `billNumber` field becomes read-only in editor.
- Number is immutable after reservation. Manual reset does not change existing bill numbers.

**Manual reset:**

- UI: confirmation dialog with destructive styling. Warning text: *"This will change the next invoice number in this series. Existing bills are not affected. This action is logged and cannot be undone."* Requires typed reason.
- API writes new value to `InvoiceSequence.currentValue` and inserts `InvoiceSequenceHistory` row.
- History table is viewable and rows are individually deletable (for cleanup; does not revert counter).

### 6.4 GST Defaults

Stored in `OrgSettings`. Applied as default values when:
- A new bill is created (sets `gstMode` in `ItemsTableData`).
- A new line item is added (pre-fills `gstRate` and splits CGST/SGST or IGST based on mode).

Configurable per bill in the editor regardless of org defaults.

### 6.5 Super Admin Panel

Route: `/admin` — `isSuperAdmin` flag on `User`, not org-scoped.

Actions:
- Create org (name + slug, validates uniqueness).
- Create first Owner user for an org (email + name + auto-generated temp password, `mustChangePassword = true`).
- List all orgs with status, member count, bill count.
- Suspend / activate org.
- Org deletion is intentionally absent from UI (manual DB operation only, to prevent accidents).

---

## 7. API Routes

### Auth

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Validate credentials, create session, set cookie |
| POST | `/api/auth/logout` | Session | Delete session, clear cookie |
| GET | `/api/auth/me` | Session | Current user + org + resolved permissions |

### Super Admin

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/admin/orgs` | isSuperAdmin | List all organizations |
| POST | `/api/admin/orgs` | isSuperAdmin | Create org + seed roles + Owner user |
| GET | `/api/admin/orgs/[orgId]` | isSuperAdmin | Org detail + stats |
| PATCH | `/api/admin/orgs/[orgId]` | isSuperAdmin | Suspend / activate org |
| POST | `/api/admin/migrate` | isSuperAdmin | Import flat-file bills/templates into target org |

### Users & Roles

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/orgs/[orgId]/users` | `users:read` | List org members with roles |
| POST | `/api/orgs/[orgId]/users` | `users:create` | Create user in org (temp password) |
| PATCH | `/api/orgs/[orgId]/users/[userId]` | `users:edit` | Update name / active status |
| DELETE | `/api/orgs/[orgId]/users/[userId]` | `users:delete` | Remove from org (not account) |
| POST | `/api/orgs/[orgId]/users/[userId]/roles` | `users:edit` | Assign roles |
| DELETE | `/api/orgs/[orgId]/users/[userId]/roles/[roleId]` | `users:edit` | Remove role |
| GET | `/api/orgs/[orgId]/roles` | `roles:read` | List roles with permissions |
| POST | `/api/orgs/[orgId]/roles` | `roles:create` | Create custom role |
| PATCH | `/api/orgs/[orgId]/roles/[roleId]` | `roles:edit` | Update (non-system roles only) |
| DELETE | `/api/orgs/[orgId]/roles/[roleId]` | `roles:delete` | Delete (non-system only) |

### Settings

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/orgs/[orgId]/settings` | `settings:read` | Get org settings |
| PATCH | `/api/orgs/[orgId]/settings` | `settings:edit` | Update org settings |

### Invoice Sequences

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/orgs/[orgId]/sequences` | `settings:read` | List sequences (all types, current FY) |
| PATCH | `/api/orgs/[orgId]/sequences/[id]` | `settings:edit` | Update prefix/typeCode/padding config |
| POST | `/api/orgs/[orgId]/sequences/[id]/reset` | `settings:edit` | Manual reset with reason |
| GET | `/api/orgs/[orgId]/sequences/[id]/history` | `settings:read` | Reset history |
| DELETE | `/api/orgs/[orgId]/sequences/[id]/history/[histId]` | `settings:edit` | Delete history record |

### Company Master

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/orgs/[orgId]/companies` | `masters:read` | List companies |
| POST | `/api/orgs/[orgId]/companies` | `masters:create` | Create company |
| GET | `/api/orgs/[orgId]/companies/[id]` | `masters:read` | Get company |
| PATCH | `/api/orgs/[orgId]/companies/[id]` | `masters:edit` | Update company |
| DELETE | `/api/orgs/[orgId]/companies/[id]` | `masters:delete` | Soft-delete (`isActive = false`) |

### Financial Accounts

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/orgs/[orgId]/financial-accounts` | `masters:read` | List accounts (filter: `?companyId=`) |
| POST | `/api/orgs/[orgId]/financial-accounts` | `masters:create` | Create account |
| GET | `/api/orgs/[orgId]/financial-accounts/[id]` | `masters:read` | Get account |
| PATCH | `/api/orgs/[orgId]/financial-accounts/[id]` | `masters:edit` | Update account |
| DELETE | `/api/orgs/[orgId]/financial-accounts/[id]` | `masters:delete` | Soft-delete |

### Bills

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/orgs/[orgId]/bills` | `bills:read` | List bills (paginated, filterable) |
| POST | `/api/orgs/[orgId]/bills` | `bills:create:<type>` | Create bill; reserves invoice number atomically |
| GET | `/api/orgs/[orgId]/bills/[id]` | `bills:read` | Get bill |
| PATCH | `/api/orgs/[orgId]/bills/[id]` | `bills:edit` | Update bill |
| DELETE | `/api/orgs/[orgId]/bills/[id]` | `bills:delete` | Delete bill |
| POST | `/api/orgs/[orgId]/bills/[id]/duplicate` | `bills:create:<type>` | Duplicate (reserves new number) |
| POST | `/api/orgs/[orgId]/bills/[id]/status` | `bills:edit` | Transition status |

### Templates

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/orgs/[orgId]/templates` | `templates:read` | List templates |
| POST | `/api/orgs/[orgId]/templates` | `templates:create` | Create template |
| GET | `/api/orgs/[orgId]/templates/[id]` | `templates:read` | Get template |
| PATCH | `/api/orgs/[orgId]/templates/[id]` | `templates:edit` | Update template |
| DELETE | `/api/orgs/[orgId]/templates/[id]` | `templates:delete` | Delete template |

---

## 8. UI Pages & Flows

### Public / Auth

| Route | Purpose |
|---|---|
| `/login` | Email + password login. Redirects to `/orgs/[orgId]/bills` on success. |
| `/admin/login` | Separate login for super admins. Same mechanism, checks `isSuperAdmin`. |

### Super Admin Panel

| Route | Purpose |
|---|---|
| `/admin` | Org list: name, slug, status, member count, bill count. Actions: suspend/activate, view detail. |
| `/admin/orgs/new` | Create org + Owner user form. Shows generated temp password on success. |
| `/admin/orgs/[orgId]` | Org detail, member list, stats. |

### Org App (all under `/orgs/[orgId]/`)

| Route | Purpose |
|---|---|
| `bills` | Bill list. Filters: type, status, FY, buyer name, date range. "New Bill" dropdown per type (hidden if missing `bills:create:<type>`). |
| `bills/new?type=invoice` | Bill editor. Company selector at top of `company_header` block. Invoice number preview shown, locked after first save. |
| `bills/[id]` | Edit existing bill. Status transition buttons in toolbar. |
| `templates` | Template list grouped by bill type. |
| `templates/new` | Template editor. |
| `templates/[id]` | Edit template. |
| `masters/companies` | Company list table. "New Company" button. |
| `masters/companies/new` | Create company (full fields). |
| `masters/companies/[id]` | Edit company. Attached financial accounts shown inline with add option. |
| `masters/financial-accounts` | All financial accounts, filterable by company. |
| `masters/financial-accounts/new` | Create account. Optional company linkage via dropdown. |
| `masters/financial-accounts/[id]` | Edit account. |
| `settings` | Tabs: **GST Defaults**, **Company & Bank** (override toggles), **Invoice Sequences** (current FY counters, prefix/format edit, reset), **General**. |
| `settings/sequences/[id]/history` | Reset history table for a specific sequence. Rows deletable. |
| `users` | Member list with assigned roles. "Invite user" button. Role assignment per row. |
| `users/[userId]` | User detail: name, email, roles, membership date. |
| `roles` | Role list. System roles have lock icon. "New Role" button. |
| `roles/new` | Create role: name, description, permission checkboxes grouped by resource. |
| `roles/[id]` | Edit custom role. System roles: view only. |

### Key In-Editor Flows

**Company selection:**
1. Combobox at top of `company_header` block.
2. Footer option "＋ Add new company" → right-side Sheet with create form; new company auto-selects on save.
3. On select: fields populate. `allowCompanyOverride = false` → inputs go read-only + "Using: [Name]" chip. `allowCompanyOverride = true` → "Override mode" badge + fields stay editable.

**Bank auto-population:**
1. Company selected + one attached account → `bank_details` block auto-populates.
2. Multiple attached accounts → secondary picker appears within the block.
3. Override behavior mirrors `allowBankOverride`.

**Invoice number:**
- Draft unsaved: shows `ACM/2526/INV/____`.
- After first save: actual number shown, field locked.

---

## 9. Implementation Phases

| Phase | Scope | Unblocks |
|---|---|---|
| **1** | Prisma schema, Docker Postgres service, DB setup, auth (login/session/middleware), `src/lib/db.ts`, `src/lib/auth.ts`, `src/lib/permissions.ts` | Everything |
| **2** | Super admin panel, org creation, system role seeding, Owner user bootstrap | Users can log in to an org |
| **3** | Users + Roles RBAC API routes + UI pages | Permission gating on all subsequent features |
| **4** | Company Master + Financial Accounts API + list/create/edit pages | Bill editor integration in Phase 6 |
| **5** | Settings page: GST defaults tab, override toggles tab (sequence tab placeholder) | Correct defaults on new bills |
| **6** | Bills + Templates migrated to DB; invoice number reservation; company/bank selectors in editor; permission-gated bill type buttons; GST defaults applied on new bill | Core app fully on DB |
| **7** | Invoice sequence management UI: prefix/format config, manual reset dialog, history table | Operational control |
| **8** | Flat-file migration script (`scripts/migrate-flatfiles.ts` + `/api/admin/migrate`) | Existing data preserved |
| **9** | Hardening: Zod validation on all routes, audit log writes, rate limiting on `/api/auth/login`, image upload strategy | Production readiness |

---

## 10. Data Migration

### Flat File → DB Mapping (Bills)

| Flat file field | DB column |
|---|---|
| `meta.id` | `Bill.legacyId` |
| `meta.billNumber` | `Bill.billNumber` |
| `meta.billType` | `Bill.billType` |
| `meta.status` | `Bill.status` |
| `meta.templateId` | `Bill.templateId` |
| `meta.duplicatedFromId` | `Bill.duplicatedFromId` |
| `meta.createdAt` | `Bill.createdAt` |
| `meta.updatedAt` | `Bill.updatedAt` |
| `meta.tags` | `Bill.tags` |
| `meta.currency` | `Bill.currency` |
| `meta.financialYear` | `Bill.financialYear` |
| `meta.buyerName` | `Bill.buyerName` |
| `meta.grandTotal` | `Bill.grandTotal` |
| `blocks` | `Bill.blocksJson` |
| `globalCanvasOverlay` | `Bill.globalCanvasJson` |
| `schemaVersion` | `Bill.schemaVersion` |

- `createdBy` / `updatedBy` → set to first Owner user of target org.
- `companyId` → null (masters didn't exist before).
- Invoice sequences: counter set to `max(numeric suffix)` across migrated bills per (billType, FY) to prevent future collisions.
- Script is idempotent: skips rows where `legacyId` already exists.

---

## 11. Decisions (Finalized 2026-05-19)

| # | Decision |
|---|---|
| **1** | **URL structure:** path-based `/orgs/[orgId]/...` |
| **2** | **Image storage:** base64 in DB (same as current flat-file behavior) |
| **3** | **Email / forgot password:** in scope for v1. Provider: **Resend** |
| **4** | **User onboarding:** Option B — invite email with time-limited setup link (72h). Super admin creates org → enters client email → Resend sends "Set up your account" link → client sets own password → logged in as Owner. Org admin invites further users the same way. Fallback: manual temp password with `mustChangePassword = true`. |
| **5** | **Invoice number reservation:** reserved on first draft save (atomic `SELECT FOR UPDATE`). Preview shown as `ACM/2526/INV/____` before first save. |
| **6** | **Bill number mutability:** locked (read-only) after first save. |
| **7** | **Financial year:** auto-computed from `order_info.billDate` if set, else server clock. Immutable after bill creation. |
