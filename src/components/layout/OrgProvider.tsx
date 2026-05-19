'use client';
import { createContext, useContext } from 'react';

interface OrgContext {
  orgId: string;
  orgName: string;
  userId: string;
}

const Ctx = createContext<OrgContext | null>(null);

export function OrgProvider({ orgId, orgName, userId, children }: OrgContext & { children: React.ReactNode }) {
  return <Ctx.Provider value={{ orgId, orgName, userId }}>{children}</Ctx.Provider>;
}

export function useOrg(): OrgContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useOrg must be used within OrgProvider');
  return ctx;
}

export function useOrgSafe(): OrgContext | null {
  return useContext(Ctx);
}
