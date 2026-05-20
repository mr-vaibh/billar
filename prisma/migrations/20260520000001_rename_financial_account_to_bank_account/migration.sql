ALTER TABLE "FinancialAccount" RENAME TO "BankAccount";
ALTER INDEX "FinancialAccount_orgId_idx" RENAME TO "BankAccount_orgId_idx";
ALTER INDEX "FinancialAccount_companyId_idx" RENAME TO "BankAccount_companyId_idx";
ALTER TABLE "BankAccount" RENAME CONSTRAINT "FinancialAccount_pkey" TO "BankAccount_pkey";
ALTER TABLE "BankAccount" RENAME CONSTRAINT "FinancialAccount_orgId_fkey" TO "BankAccount_orgId_fkey";
ALTER TABLE "BankAccount" RENAME CONSTRAINT "FinancialAccount_companyId_fkey" TO "BankAccount_companyId_fkey";
