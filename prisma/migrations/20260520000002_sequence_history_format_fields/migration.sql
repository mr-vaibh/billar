ALTER TABLE "InvoiceSequenceHistory"
  ADD COLUMN "previousPrefix"      TEXT NOT NULL DEFAULT '',
  ADD COLUMN "newPrefix"           TEXT NOT NULL DEFAULT '',
  ADD COLUMN "previousTypeCode"    TEXT NOT NULL DEFAULT '',
  ADD COLUMN "newTypeCode"         TEXT NOT NULL DEFAULT '',
  ADD COLUMN "previousZeroPadding" INTEGER NOT NULL DEFAULT 4,
  ADD COLUMN "newZeroPadding"      INTEGER NOT NULL DEFAULT 4;
