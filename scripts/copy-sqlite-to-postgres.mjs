/**
 * Kopiert alle Anwendungsdaten aus dem SQLite-Backup (prisma/dev.db.backup)
 * in die aktuell konfigurierte Prisma-Datenbank (Postgres via DATABASE_URL).
 *
 * Idempotent: benutzt upsert / findUnique, überspringt vorhandene IDs.
 */

import Database from "better-sqlite3";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const SQLITE_PATH =
  process.env.SQLITE_SOURCE_PATH ||
  path.join(process.cwd(), "prisma", "dev.db.backup");

const src = new Database(SQLITE_PATH, { readonly: true });
const prisma = new PrismaClient();

const stats = {
  settings: 0,
  customers: 0,
  leads: 0,
  leadEmails: 0,
  costs: 0,
  invoices: 0,
  invoiceItems: 0,
  uploadedInvoices: 0,
  cashIncomes: 0,
  scopeItems: 0,
  skipped: 0,
};

function toDate(v) {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === "number") return new Date(v);
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function toBool(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const s = String(v).toLowerCase().trim();
  return s === "1" || s === "true" || s === "t";
}
function nOrNull(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function sOrNull(v) {
  if (v === null || v === undefined) return null;
  const s = String(v);
  return s === "" ? null : s;
}

async function main() {
  try {
    // ---------- Settings ----------
    const s = src.prepare(`SELECT * FROM Settings WHERE id = 1`).get();
    if (s) {
      await prisma.settings.upsert({
        where: { id: 1 },
        create: {
          id: 1,
          businessName: s.businessName ?? "Fylu Marketing & Design",
          businessAddress: s.businessAddress ?? "",
          businessEmail: s.businessEmail ?? "",
          businessPhone: s.businessPhone ?? "",
          taxId: s.taxId ?? "",
          iban: s.iban ?? "",
          bic: s.bic ?? "",
          bankName: s.bankName ?? "",
          logoPath: sOrNull(s.logoPath),
          vatRate: nOrNull(s.vatRate) ?? 19,
          paymentTermsDays: nOrNull(s.paymentTermsDays) ?? 14,
          invoiceNumberPrefix: s.invoiceNumberPrefix ?? "RE",
          invoiceNumberCounter: nOrNull(s.invoiceNumberCounter) ?? 1,
          invoiceFooter:
            s.invoiceFooter ?? "Vielen Dank für die gute Zusammenarbeit.",
          invoiceLayoutPrimary: s.invoiceLayoutPrimary ?? "#0B0B0E",
          invoiceLayoutAccent: s.invoiceLayoutAccent ?? "#1F2937",
          ollamaModel: s.ollamaModel ?? "llama3.2",
          ollamaBaseUrl: s.ollamaBaseUrl ?? "http://localhost:11434",
          openAIApiKey: sOrNull(s.openAIApiKey),
          openAIModel: s.openAIModel ?? "gpt-4o-mini",
          googleAdsCustomerId: sOrNull(s.googleAdsCustomerId),
          googleAdsRefreshToken: sOrNull(s.googleAdsRefreshToken),
          googleAdsDeveloperToken: sOrNull(s.googleAdsDeveloperToken),
        },
        update: {},
      });
      stats.settings = 1;
    }

    // ---------- Customers ----------
    const customers = src.prepare(`SELECT * FROM Customer`).all();
    for (const c of customers) {
      const exists = await prisma.customer.findUnique({ where: { id: c.id } });
      if (exists) {
        stats.skipped++;
        continue;
      }
      await prisma.customer.create({
        data: {
          id: c.id,
          name: c.name ?? "(ohne Namen)",
          company: sOrNull(c.company),
          email: sOrNull(c.email),
          phone: sOrNull(c.phone),
          address: sOrNull(c.address),
          taxId: sOrNull(c.taxId),
          notes: sOrNull(c.notes),
          archivedAt: toDate(c.archivedAt),
          lastContactAt: toDate(c.lastContactAt),
          createdAt: toDate(c.createdAt) ?? new Date(),
          updatedAt: toDate(c.updatedAt) ?? new Date(),
          processOfferAccepted: toBool(c.processOfferAccepted),
          processScopeDefined: toBool(c.processScopeDefined),
          processPreferencesCollected: toBool(c.processPreferencesCollected),
          processDownPaymentPaid: toBool(c.processDownPaymentPaid),
          processProjectCompleted: toBool(c.processProjectCompleted),
          processFinalInvoicePaid: toBool(c.processFinalInvoicePaid),
          processReferenceCollected: toBool(c.processReferenceCollected),
          scopeDocumentPath: sOrNull(c.scopeDocumentPath),
          scopeDocumentFilename: sOrNull(c.scopeDocumentFilename),
          scopeDocumentUploadedAt: toDate(c.scopeDocumentUploadedAt),
        },
      });
      stats.customers++;
    }

    // ---------- Costs ----------
    const costs = src.prepare(`SELECT * FROM Cost`).all();
    for (const co of costs) {
      if (await prisma.cost.findUnique({ where: { id: co.id } })) {
        stats.skipped++;
        continue;
      }
      await prisma.cost.create({
        data: {
          id: co.id,
          customerId: co.customerId,
          description: co.description ?? "(ohne Beschreibung)",
          amount: nOrNull(co.amount) ?? 0,
          frequency: co.frequency ?? "once",
          dueDate: toDate(co.dueDate),
          createdAt: toDate(co.createdAt) ?? new Date(),
        },
      });
      stats.costs++;
    }

    // ---------- Invoices ----------
    const invoices = src.prepare(`SELECT * FROM Invoice`).all();
    for (const inv of invoices) {
      if (await prisma.invoice.findUnique({ where: { id: inv.id } })) {
        stats.skipped++;
        continue;
      }
      await prisma.invoice.create({
        data: {
          id: inv.id,
          customerId: inv.customerId,
          number: inv.number,
          date: toDate(inv.date) ?? new Date(),
          dueDate: toDate(inv.dueDate),
          status: inv.status ?? "draft",
          subtotal: nOrNull(inv.subtotal) ?? 0,
          vatRate: nOrNull(inv.vatRate) ?? 19,
          vatAmount: nOrNull(inv.vatAmount) ?? 0,
          total: nOrNull(inv.total) ?? 0,
          notes: sOrNull(inv.notes),
          paidAt: toDate(inv.paidAt),
          pdfPath: sOrNull(inv.pdfPath),
          createdAt: toDate(inv.createdAt) ?? new Date(),
          updatedAt: toDate(inv.updatedAt) ?? new Date(),
        },
      });
      stats.invoices++;
    }

    // ---------- InvoiceItems ----------
    const items = src.prepare(`SELECT * FROM InvoiceItem`).all();
    for (const it of items) {
      if (await prisma.invoiceItem.findUnique({ where: { id: it.id } })) {
        stats.skipped++;
        continue;
      }
      await prisma.invoiceItem.create({
        data: {
          id: it.id,
          invoiceId: it.invoiceId,
          description: it.description ?? "(ohne Beschreibung)",
          quantity: nOrNull(it.quantity) ?? 1,
          unitPrice: nOrNull(it.unitPrice) ?? 0,
          total: nOrNull(it.total) ?? 0,
          order: nOrNull(it.order) ?? 0,
        },
      });
      stats.invoiceItems++;
    }

    // ---------- UploadedInvoices ----------
    const uploaded = src.prepare(`SELECT * FROM UploadedInvoice`).all();
    for (const u of uploaded) {
      if (await prisma.uploadedInvoice.findUnique({ where: { id: u.id } })) {
        stats.skipped++;
        continue;
      }
      await prisma.uploadedInvoice.create({
        data: {
          id: u.id,
          customerId: u.customerId,
          filename: u.filename ?? "unbekannt.pdf",
          path: u.path ?? "",
          extractedTotal: nOrNull(u.extractedTotal),
          extractedNet: nOrNull(u.extractedNet),
          extractedVat: nOrNull(u.extractedVat),
          extractedDate: toDate(u.extractedDate),
          extractedRaw: sOrNull(u.extractedRaw),
          status: u.status ?? "pending",
          uploadedAt: toDate(u.uploadedAt) ?? new Date(),
        },
      });
      stats.uploadedInvoices++;
    }

    // ---------- CashIncome ----------
    const cash = src.prepare(`SELECT * FROM CashIncome`).all();
    for (const ci of cash) {
      if (await prisma.cashIncome.findUnique({ where: { id: ci.id } })) {
        stats.skipped++;
        continue;
      }
      await prisma.cashIncome.create({
        data: {
          id: ci.id,
          customerId: ci.customerId,
          details: ci.details ?? "(ohne Beschreibung)",
          amount: nOrNull(ci.amount) ?? 0,
          date: toDate(ci.date) ?? new Date(),
          notes: sOrNull(ci.notes),
          createdAt: toDate(ci.createdAt) ?? new Date(),
        },
      });
      stats.cashIncomes++;
    }

    // ---------- CustomerScopeItem ----------
    const scopes = src.prepare(`SELECT * FROM CustomerScopeItem`).all();
    for (const si of scopes) {
      if (await prisma.customerScopeItem.findUnique({ where: { id: si.id } })) {
        stats.skipped++;
        continue;
      }
      await prisma.customerScopeItem.create({
        data: {
          id: si.id,
          customerId: si.customerId,
          title: si.title ?? "(ohne Titel)",
          details: sOrNull(si.details),
          quantity: nOrNull(si.quantity) ?? 1,
          unitPrice: nOrNull(si.unitPrice),
          order: nOrNull(si.order) ?? 0,
          done: toBool(si.done),
          createdAt: toDate(si.createdAt) ?? new Date(),
        },
      });
      stats.scopeItems++;
    }

    // ---------- Leads + Emails ----------
    const leads = src.prepare(`SELECT * FROM Lead`).all();
    for (const l of leads) {
      if (await prisma.lead.findUnique({ where: { id: l.id } })) {
        stats.skipped++;
        continue;
      }
      await prisma.lead.create({
        data: {
          id: l.id,
          name: l.name ?? "(ohne Namen)",
          company: sOrNull(l.company),
          email: sOrNull(l.email),
          phone: sOrNull(l.phone),
          source: sOrNull(l.source),
          status: l.status ?? "new",
          expectedValue: nOrNull(l.expectedValue),
          offerDescription: sOrNull(l.offerDescription),
          notes: sOrNull(l.notes),
          lastContactAt: toDate(l.lastContactAt),
          createdAt: toDate(l.createdAt) ?? new Date(),
          updatedAt: toDate(l.updatedAt) ?? new Date(),
        },
      });
      stats.leads++;
    }

    const leadEmails = src.prepare(`SELECT * FROM LeadEmail`).all();
    for (const e of leadEmails) {
      if (await prisma.leadEmail.findUnique({ where: { id: e.id } })) {
        stats.skipped++;
        continue;
      }
      await prisma.leadEmail.create({
        data: {
          id: e.id,
          leadId: e.leadId,
          direction: e.direction ?? "sent",
          subject: e.subject ?? "",
          body: e.body ?? "",
          summary: sOrNull(e.summary),
          summaryUpdatedAt: toDate(e.summaryUpdatedAt),
          sentAt: toDate(e.sentAt),
          createdAt: toDate(e.createdAt) ?? new Date(),
        },
      });
      stats.leadEmails++;
    }
  } finally {
    src.close();
    await prisma.$disconnect();
  }

  console.log("Kopie abgeschlossen.");
  console.table(stats);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
