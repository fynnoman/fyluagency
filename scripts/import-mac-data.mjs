/**
 * Importiert alle Daten des Fylu-Marketing-Workspace aus der Mac-SwiftData-DB
 * in die Web-Prisma-DB. Idempotent: wird ein Datensatz mit derselben Mac-UUID
 * (Feld ZID) schon in der Web-DB gefunden, wird er übersprungen.
 *
 * Ausgelassen: Issues, Todos, Quotes, Appointments, Ideas, MailAccounts,
 * MailMessages (bewusst entfernte Konzepte). LeadEmails, CashIncome und
 * Prozess-Felder werden mitgenommen.
 */

import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";

const STORE_PATH =
  process.env.FYLU_STORE_PATH ||
  `${process.env.HOME}/Library/Application Support/FyluAgency.store`;

const TARGET_WORKSPACE_PK = 1; // Fylu Marketing

const CORE_DATA_EPOCH_OFFSET = 978307200; // Sekunden zw. 1970-01-01 und 2001-01-01 UTC

function cdDate(v) {
  if (v === null || v === undefined) return null;
  const num = Number(v);
  if (!Number.isFinite(num)) return null;
  return new Date((num + CORE_DATA_EPOCH_OFFSET) * 1000);
}

function s(v) {
  if (v === null || v === undefined) return null;
  if (Buffer.isBuffer(v)) return null;
  const str = String(v).trim();
  return str === "" ? null : str;
}

/** Wandelt einen 16-Byte-UUID-Blob in die kanonische 8-4-4-4-12 Darstellung. */
function uuidFromBlob(v) {
  if (!v) return null;
  const buf = Buffer.isBuffer(v) ? v : Buffer.from(v);
  if (buf.length !== 16) return null;
  const hex = buf.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`.toLowerCase();
}

async function main() {
  const src = new Database(STORE_PATH, { readonly: true });
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
    skipped: 0,
  };

  try {
    // ------- Settings aus dem Workspace ziehen -------
    const ws = src
      .prepare(`SELECT * FROM ZWORKSPACE WHERE Z_PK = ?`)
      .get(TARGET_WORKSPACE_PK);

    if (ws) {
      await prisma.settings.upsert({
        where: { id: 1 },
        create: {
          id: 1,
          businessName: ws.ZBUSINESSNAME || ws.ZNAME || "Fylu Marketing",
          businessAddress: ws.ZBUSINESSADDRESS || "",
          businessEmail: ws.ZBUSINESSEMAIL || "",
          businessPhone: ws.ZBUSINESSPHONE || "",
          taxId: ws.ZTAXID || "",
          iban: ws.ZIBAN || "",
          bic: ws.ZBIC || "",
          bankName: ws.ZBANKNAME || "",
          vatRate: ws.ZVATRATE ?? 19,
          paymentTermsDays: ws.ZPAYMENTTERMSDAYS ?? 14,
          invoiceNumberPrefix: ws.ZINVOICENUMBERPREFIX || "RE",
          invoiceNumberCounter: ws.ZINVOICENUMBERCOUNTER ?? 1,
          invoiceFooter:
            ws.ZINVOICEFOOTER || "Vielen Dank für die gute Zusammenarbeit.",
          invoiceLayoutPrimary: ws.ZLAYOUTPRIMARYHEX || "#0B0B0E",
          invoiceLayoutAccent: ws.ZLAYOUTACCENTHEX || "#1F2937",
        },
        update: {
          businessName: ws.ZBUSINESSNAME || ws.ZNAME || "Fylu Marketing",
          businessAddress: ws.ZBUSINESSADDRESS || "",
          businessEmail: ws.ZBUSINESSEMAIL || "",
          businessPhone: ws.ZBUSINESSPHONE || "",
          taxId: ws.ZTAXID || "",
          iban: ws.ZIBAN || "",
          bic: ws.ZBIC || "",
          bankName: ws.ZBANKNAME || "",
          vatRate: ws.ZVATRATE ?? 19,
          paymentTermsDays: ws.ZPAYMENTTERMSDAYS ?? 14,
          invoiceNumberPrefix: ws.ZINVOICENUMBERPREFIX || "RE",
          invoiceNumberCounter: ws.ZINVOICENUMBERCOUNTER ?? 1,
          invoiceFooter:
            ws.ZINVOICEFOOTER || "Vielen Dank für die gute Zusammenarbeit.",
          invoiceLayoutPrimary: ws.ZLAYOUTPRIMARYHEX || "#0B0B0E",
          invoiceLayoutAccent: ws.ZLAYOUTACCENTHEX || "#1F2937",
        },
      });
      stats.settings = 1;
    }

    // ------- Customers -------
    const customers = src
      .prepare(`SELECT * FROM ZCUSTOMER WHERE ZWORKSPACE = ?`)
      .all(TARGET_WORKSPACE_PK);

    const customerPkToWebId = new Map();

    for (const c of customers) {
      const macId = uuidFromBlob(c.ZID);
      if (!macId) {
        stats.skipped++;
        continue;
      }
      const existing = await prisma.customer.findUnique({ where: { id: macId } });
      if (existing) {
        customerPkToWebId.set(c.Z_PK, existing.id);
        stats.skipped++;
        continue;
      }
      const created = await prisma.customer.create({
        data: {
          id: macId,
          name: c.ZNAME || "(ohne Namen)",
          company: s(c.ZCOMPANY),
          email: s(c.ZEMAIL),
          phone: s(c.ZPHONE),
          address: s(c.ZADDRESS),
          taxId: s(c.ZTAXID),
          notes: s(c.ZNOTES),
          archivedAt: cdDate(c.ZARCHIVEDAT),
          lastContactAt: cdDate(c.ZLASTCONTACTAT),
          createdAt: cdDate(c.ZCREATEDAT) || new Date(),
          updatedAt: cdDate(c.ZUPDATEDAT) || new Date(),
        },
      });
      customerPkToWebId.set(c.Z_PK, created.id);
      stats.customers++;
    }

    // ------- Costs -------
    const costs = src
      .prepare(
        `SELECT * FROM ZCOST WHERE ZCUSTOMER IN (SELECT Z_PK FROM ZCUSTOMER WHERE ZWORKSPACE = ?)`,
      )
      .all(TARGET_WORKSPACE_PK);
    for (const co of costs) {
      const macId = uuidFromBlob(co.ZID);
      const customerId = customerPkToWebId.get(co.ZCUSTOMER);
      if (!macId || !customerId) {
        stats.skipped++;
        continue;
      }
      if (await prisma.cost.findUnique({ where: { id: macId } })) {
        stats.skipped++;
        continue;
      }
      await prisma.cost.create({
        data: {
          id: macId,
          customerId,
          description: co.ZDETAILS || "(ohne Beschreibung)",
          amount: co.ZAMOUNT ?? 0,
          frequency: co.ZFREQUENCYRAW || "once",
          dueDate: cdDate(co.ZDUEDATE),
          createdAt: cdDate(co.ZCREATEDAT) || new Date(),
        },
      });
      stats.costs++;
    }

    // ------- Invoices + Items -------
    const invoices = src
      .prepare(
        `SELECT * FROM ZINVOICE WHERE ZCUSTOMER IN (SELECT Z_PK FROM ZCUSTOMER WHERE ZWORKSPACE = ?)`,
      )
      .all(TARGET_WORKSPACE_PK);
    const invoicePkToWebId = new Map();
    for (const inv of invoices) {
      const macId = uuidFromBlob(inv.ZID);
      const customerId = customerPkToWebId.get(inv.ZCUSTOMER);
      if (!macId || !customerId) {
        stats.skipped++;
        continue;
      }
      if (await prisma.invoice.findUnique({ where: { id: macId } })) {
        invoicePkToWebId.set(inv.Z_PK, macId);
        stats.skipped++;
        continue;
      }
      const created = await prisma.invoice.create({
        data: {
          id: macId,
          customerId,
          number: inv.ZNUMBER || `IMP-${macId.slice(0, 8)}`,
          date: cdDate(inv.ZDATE) || new Date(),
          dueDate: cdDate(inv.ZDUEDATE),
          status: inv.ZSTATUSRAW || "draft",
          subtotal: inv.ZSUBTOTAL ?? 0,
          vatRate: inv.ZVATRATE ?? 19,
          vatAmount: inv.ZVATAMOUNT ?? 0,
          total: inv.ZTOTAL ?? 0,
          notes: s(inv.ZNOTES),
          paidAt: cdDate(inv.ZPAIDAT),
          createdAt: cdDate(inv.ZCREATEDAT) || new Date(),
          updatedAt: cdDate(inv.ZUPDATEDAT) || new Date(),
        },
      });
      invoicePkToWebId.set(inv.Z_PK, created.id);
      stats.invoices++;
    }

    const items = src
      .prepare(
        `SELECT * FROM ZINVOICEITEM WHERE ZINVOICE IN (SELECT Z_PK FROM ZINVOICE WHERE ZCUSTOMER IN (SELECT Z_PK FROM ZCUSTOMER WHERE ZWORKSPACE = ?))`,
      )
      .all(TARGET_WORKSPACE_PK);
    for (const it of items) {
      const macId = uuidFromBlob(it.ZID);
      const invoiceId = invoicePkToWebId.get(it.ZINVOICE);
      if (!macId || !invoiceId) {
        stats.skipped++;
        continue;
      }
      if (await prisma.invoiceItem.findUnique({ where: { id: macId } })) {
        stats.skipped++;
        continue;
      }
      const qty = it.ZQUANTITY ?? 1;
      const unit = it.ZUNITPRICE ?? 0;
      await prisma.invoiceItem.create({
        data: {
          id: macId,
          invoiceId,
          description: it.ZDETAILS || "(ohne Beschreibung)",
          quantity: qty,
          unitPrice: unit,
          total: qty * unit,
          order: it.ZORDER ?? 0,
        },
      });
      stats.invoiceItems++;
    }

    // ------- Uploaded Invoices -------
    const uploaded = src
      .prepare(
        `SELECT * FROM ZUPLOADEDINVOICE WHERE ZCUSTOMER IN (SELECT Z_PK FROM ZCUSTOMER WHERE ZWORKSPACE = ?)`,
      )
      .all(TARGET_WORKSPACE_PK);
    for (const u of uploaded) {
      const macId = uuidFromBlob(u.ZID);
      const customerId = customerPkToWebId.get(u.ZCUSTOMER);
      if (!macId || !customerId) {
        stats.skipped++;
        continue;
      }
      if (await prisma.uploadedInvoice.findUnique({ where: { id: macId } })) {
        stats.skipped++;
        continue;
      }
      const rawUrl = s(u.ZFILEURL) || "";
      const filePath = rawUrl.startsWith("file://")
        ? decodeURIComponent(rawUrl.slice(7))
        : rawUrl;
      await prisma.uploadedInvoice.create({
        data: {
          id: macId,
          customerId,
          filename: u.ZFILENAME || "unbekannt.pdf",
          path: filePath,
          extractedTotal: u.ZEXTRACTEDTOTAL ?? null,
          extractedNet: u.ZEXTRACTEDNET ?? null,
          extractedVat: u.ZEXTRACTEDVAT ?? null,
          extractedDate: cdDate(u.ZEXTRACTEDDATE),
          extractedRaw: s(u.ZEXTRACTEDRAW),
          status: u.ZSTATUSRAW || "pending",
          uploadedAt: cdDate(u.ZUPLOADEDAT) || new Date(),
        },
      });
      stats.uploadedInvoices++;
    }

    // ------- Cash income -------
    const cash = src
      .prepare(
        `SELECT * FROM ZCASHINCOME WHERE ZCUSTOMER IN (SELECT Z_PK FROM ZCUSTOMER WHERE ZWORKSPACE = ?)`,
      )
      .all(TARGET_WORKSPACE_PK);
    for (const ci of cash) {
      const macId = uuidFromBlob(ci.ZID);
      const customerId = customerPkToWebId.get(ci.ZCUSTOMER);
      if (!macId || !customerId) {
        stats.skipped++;
        continue;
      }
      if (await prisma.cashIncome.findUnique({ where: { id: macId } })) {
        stats.skipped++;
        continue;
      }
      await prisma.cashIncome.create({
        data: {
          id: macId,
          customerId,
          details: ci.ZDETAILS || "(ohne Beschreibung)",
          amount: ci.ZAMOUNT ?? 0,
          date: cdDate(ci.ZDATE) || new Date(),
          notes: s(ci.ZNOTES),
          createdAt: cdDate(ci.ZCREATEDAT) || new Date(),
        },
      });
      stats.cashIncomes++;
    }

    // ------- Leads + Emails -------
    const leads = src
      .prepare(`SELECT * FROM ZLEAD WHERE ZWORKSPACE = ?`)
      .all(TARGET_WORKSPACE_PK);
    const leadPkToWebId = new Map();
    for (const l of leads) {
      const macId = uuidFromBlob(l.ZID);
      if (!macId) {
        stats.skipped++;
        continue;
      }
      if (await prisma.lead.findUnique({ where: { id: macId } })) {
        leadPkToWebId.set(l.Z_PK, macId);
        stats.skipped++;
        continue;
      }
      const created = await prisma.lead.create({
        data: {
          id: macId,
          name: l.ZNAME || "(ohne Namen)",
          company: s(l.ZCOMPANY),
          email: s(l.ZEMAIL),
          phone: s(l.ZPHONE),
          source: s(l.ZSOURCE),
          status: l.ZSTATUSRAW || "new",
          expectedValue: l.ZEXPECTEDVALUE ?? null,
          offerDescription: s(l.ZOFFERDESCRIPTION),
          notes: s(l.ZNOTES),
          lastContactAt: cdDate(l.ZLASTCONTACTAT),
          createdAt: cdDate(l.ZCREATEDAT) || new Date(),
          updatedAt: cdDate(l.ZUPDATEDAT) || new Date(),
        },
      });
      leadPkToWebId.set(l.Z_PK, created.id);
      stats.leads++;
    }

    const leadEmails = src
      .prepare(
        `SELECT * FROM ZLEADEMAIL WHERE ZLEAD IN (SELECT Z_PK FROM ZLEAD WHERE ZWORKSPACE = ?)`,
      )
      .all(TARGET_WORKSPACE_PK);
    for (const e of leadEmails) {
      const macId = uuidFromBlob(e.ZID);
      const leadId = leadPkToWebId.get(e.ZLEAD);
      if (!macId || !leadId) {
        stats.skipped++;
        continue;
      }
      if (await prisma.leadEmail.findUnique({ where: { id: macId } })) {
        stats.skipped++;
        continue;
      }
      await prisma.leadEmail.create({
        data: {
          id: macId,
          leadId,
          direction: e.ZDIRECTIONRAW || "sent",
          subject: e.ZSUBJECT || "",
          body: e.ZBODY || "",
          summary: s(e.ZSUMMARY),
          summaryUpdatedAt: cdDate(e.ZSUMMARYUPDATEDAT),
          sentAt: cdDate(e.ZSENTAT),
          createdAt: cdDate(e.ZCREATEDAT) || new Date(),
        },
      });
      stats.leadEmails++;
    }
  } finally {
    src.close();
    await prisma.$disconnect();
  }

  console.log("Import fertig.");
  console.table(stats);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
