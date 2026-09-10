-- Performance indexes for common query patterns.
-- These are all CREATE INDEX operations: additive, backwards compatible,
-- and safe to run against a populated database.

-- Invoice: dashboard filters by date range + status, joins by customerId
CREATE INDEX IF NOT EXISTS "Invoice_customerId_idx" ON "Invoice"("customerId");
CREATE INDEX IF NOT EXISTS "Invoice_date_idx" ON "Invoice"("date");
CREATE INDEX IF NOT EXISTS "Invoice_status_idx" ON "Invoice"("status");

-- InvoiceItem: fetched by invoiceId
CREATE INDEX IF NOT EXISTS "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

-- Lead: list filtered by status, ordered by updatedAt
CREATE INDEX IF NOT EXISTS "Lead_status_idx" ON "Lead"("status");
CREATE INDEX IF NOT EXISTS "Lead_updatedAt_idx" ON "Lead"("updatedAt");

-- LeadEmail: fetched by leadId
CREATE INDEX IF NOT EXISTS "LeadEmail_leadId_idx" ON "LeadEmail"("leadId");

-- Customer: dashboard filters archivedAt, orders by updatedAt
CREATE INDEX IF NOT EXISTS "Customer_archivedAt_idx" ON "Customer"("archivedAt");
CREATE INDEX IF NOT EXISTS "Customer_updatedAt_idx" ON "Customer"("updatedAt");

-- Child tables of Customer: FK-based joins
CREATE INDEX IF NOT EXISTS "Cost_customerId_idx" ON "Cost"("customerId");
CREATE INDEX IF NOT EXISTS "UploadedInvoice_customerId_idx" ON "UploadedInvoice"("customerId");
CREATE INDEX IF NOT EXISTS "CustomerScopeItem_customerId_idx" ON "CustomerScopeItem"("customerId");
CREATE INDEX IF NOT EXISTS "CashIncome_customerId_idx" ON "CashIncome"("customerId");
