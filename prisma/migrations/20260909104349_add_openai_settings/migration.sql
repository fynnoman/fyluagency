-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "businessName" TEXT NOT NULL DEFAULT 'Fylu Marketing & Design',
    "businessAddress" TEXT NOT NULL DEFAULT '',
    "businessEmail" TEXT NOT NULL DEFAULT '',
    "businessPhone" TEXT NOT NULL DEFAULT '',
    "taxId" TEXT NOT NULL DEFAULT '',
    "iban" TEXT NOT NULL DEFAULT '',
    "bic" TEXT NOT NULL DEFAULT '',
    "bankName" TEXT NOT NULL DEFAULT '',
    "logoPath" TEXT,
    "vatRate" REAL NOT NULL DEFAULT 19,
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 14,
    "invoiceNumberPrefix" TEXT NOT NULL DEFAULT 'RE',
    "invoiceNumberCounter" INTEGER NOT NULL DEFAULT 1,
    "invoiceFooter" TEXT NOT NULL DEFAULT 'Vielen Dank für die gute Zusammenarbeit.',
    "invoiceLayoutPrimary" TEXT NOT NULL DEFAULT '#0B0B0E',
    "invoiceLayoutAccent" TEXT NOT NULL DEFAULT '#1F2937',
    "ollamaModel" TEXT NOT NULL DEFAULT 'llama3.2',
    "ollamaBaseUrl" TEXT NOT NULL DEFAULT 'http://localhost:11434',
    "openAIApiKey" TEXT,
    "openAIModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "googleAdsCustomerId" TEXT,
    "googleAdsRefreshToken" TEXT,
    "googleAdsDeveloperToken" TEXT,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("bankName", "bic", "businessAddress", "businessEmail", "businessName", "businessPhone", "googleAdsCustomerId", "googleAdsDeveloperToken", "googleAdsRefreshToken", "iban", "id", "invoiceFooter", "invoiceLayoutAccent", "invoiceLayoutPrimary", "invoiceNumberCounter", "invoiceNumberPrefix", "logoPath", "ollamaBaseUrl", "ollamaModel", "paymentTermsDays", "taxId", "updatedAt", "vatRate") SELECT "bankName", "bic", "businessAddress", "businessEmail", "businessName", "businessPhone", "googleAdsCustomerId", "googleAdsDeveloperToken", "googleAdsRefreshToken", "iban", "id", "invoiceFooter", "invoiceLayoutAccent", "invoiceLayoutPrimary", "invoiceNumberCounter", "invoiceNumberPrefix", "logoPath", "ollamaBaseUrl", "ollamaModel", "paymentTermsDays", "taxId", "updatedAt", "vatRate" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
