-- Add multi-workspace support.
-- 1) Create Workspace table + a default workspace to hold all existing rows.
-- 2) Backfill workspaceId on Settings, Customer, Lead, Invoice.
-- 3) Convert Settings.id (Int PK) to workspaceId (String PK).
-- 4) Replace Invoice.number global unique with per-workspace composite unique.
--
-- Safe against a populated DB: everything is backfilled to the default
-- workspace so no row is orphaned before constraints are enforced.

-- 1. Workspace table
CREATE TABLE "Workspace" (
    "id"        TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "slug"      TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");
CREATE INDEX "Workspace_createdAt_idx" ON "Workspace"("createdAt");

-- 1b. Default workspace (stable id used as backfill target)
INSERT INTO "Workspace" ("id", "name", "slug", "createdAt", "updatedAt")
VALUES ('ws_default_fylu', 'Fylu Marketing & Design', 'default', NOW(), NOW());

-- 2a. Customer.workspaceId
ALTER TABLE "Customer" ADD COLUMN "workspaceId" TEXT;
UPDATE "Customer" SET "workspaceId" = 'ws_default_fylu' WHERE "workspaceId" IS NULL;
ALTER TABLE "Customer" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Customer"
  ADD CONSTRAINT "Customer_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Customer_workspaceId_idx" ON "Customer"("workspaceId");

-- 2b. Lead.workspaceId
ALTER TABLE "Lead" ADD COLUMN "workspaceId" TEXT;
UPDATE "Lead" SET "workspaceId" = 'ws_default_fylu' WHERE "workspaceId" IS NULL;
ALTER TABLE "Lead" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Lead"
  ADD CONSTRAINT "Lead_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Lead_workspaceId_idx" ON "Lead"("workspaceId");

-- 2c. Invoice.workspaceId + replace unique on number with composite unique
ALTER TABLE "Invoice" ADD COLUMN "workspaceId" TEXT;
UPDATE "Invoice" SET "workspaceId" = 'ws_default_fylu' WHERE "workspaceId" IS NULL;
ALTER TABLE "Invoice" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Invoice_workspaceId_idx" ON "Invoice"("workspaceId");
DROP INDEX IF EXISTS "Invoice_number_key";
ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_number_key";
CREATE UNIQUE INDEX "Invoice_workspaceId_number_key" ON "Invoice"("workspaceId", "number");

-- 3. Settings: convert singleton (id Int PK) to per-workspace (workspaceId String PK)
ALTER TABLE "Settings" ADD COLUMN "workspaceId" TEXT;
UPDATE "Settings" SET "workspaceId" = 'ws_default_fylu' WHERE "workspaceId" IS NULL;
ALTER TABLE "Settings" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Settings" DROP CONSTRAINT "Settings_pkey";
ALTER TABLE "Settings" DROP COLUMN "id";
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_pkey" PRIMARY KEY ("workspaceId");
ALTER TABLE "Settings"
  ADD CONSTRAINT "Settings_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
