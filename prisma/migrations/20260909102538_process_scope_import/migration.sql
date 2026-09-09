-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "offerDescription" TEXT;

-- CreateTable
CREATE TABLE "LeadEmail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'sent',
    "subject" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "summary" TEXT,
    "summaryUpdatedAt" DATETIME,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeadEmail_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomerScopeItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT,
    "quantity" REAL NOT NULL DEFAULT 1,
    "unitPrice" REAL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerScopeItem_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CashIncome" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CashIncome_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "taxId" TEXT,
    "notes" TEXT,
    "archivedAt" DATETIME,
    "lastContactAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "processOfferAccepted" BOOLEAN NOT NULL DEFAULT false,
    "processScopeDefined" BOOLEAN NOT NULL DEFAULT false,
    "processPreferencesCollected" BOOLEAN NOT NULL DEFAULT false,
    "processDownPaymentPaid" BOOLEAN NOT NULL DEFAULT false,
    "processProjectCompleted" BOOLEAN NOT NULL DEFAULT false,
    "processFinalInvoicePaid" BOOLEAN NOT NULL DEFAULT false,
    "processReferenceCollected" BOOLEAN NOT NULL DEFAULT false,
    "scopeDocumentPath" TEXT,
    "scopeDocumentFilename" TEXT,
    "scopeDocumentUploadedAt" DATETIME
);
INSERT INTO "new_Customer" ("address", "archivedAt", "company", "createdAt", "email", "id", "name", "notes", "phone", "taxId", "updatedAt") SELECT "address", "archivedAt", "company", "createdAt", "email", "id", "name", "notes", "phone", "taxId", "updatedAt" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
