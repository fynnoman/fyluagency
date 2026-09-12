import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { renderToBuffer } from "@react-pdf/renderer";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { InvoicePdf } from "@/lib/invoice-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

function csvEscape(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvEscape).join(",")];
  for (const r of rows) lines.push(r.map(csvEscape).join(","));
  return lines.join("\n") + "\n";
}

function slug(s: string): string {
  const out = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return out || "kunde";
}

function safePart(s: string): string {
  return s.replace(/[^a-zA-Z0-9._\- ]/g, "_");
}

function isoDate(d: Date | null | undefined): string {
  return d ? new Date(d).toISOString() : "";
}

export async function GET(_req: NextRequest, ctx: Params) {
  const { id } = await ctx.params;
  const workspaceId = await getCurrentWorkspaceId();

  const customer = await prisma.customer.findFirst({
    where: { id, workspaceId },
    include: {
      scopeItems: { orderBy: { order: "asc" } },
      costs: { orderBy: { createdAt: "desc" } },
      invoices: {
        orderBy: { date: "desc" },
        include: { items: { orderBy: { order: "asc" } } },
      },
      uploadedInvoices: { orderBy: { uploadedAt: "desc" } },
    },
  });

  if (!customer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const settings = await getSettings();

  let logoDataUrl: string | null = null;
  if (settings.logoPath) {
    try {
      let buf: Buffer;
      const source = settings.logoPath;
      if (source.startsWith("http://") || source.startsWith("https://")) {
        const res = await fetch(source);
        if (!res.ok) throw new Error(`logo fetch ${res.status}`);
        buf = Buffer.from(await res.arrayBuffer());
      } else {
        const filePath = path.join(process.cwd(), "public", source);
        buf = await fs.readFile(filePath);
      }
      const lower = source.toLowerCase();
      const mime = lower.endsWith(".svg")
        ? "image/svg+xml"
        : lower.endsWith(".jpg") || lower.endsWith(".jpeg")
          ? "image/jpeg"
          : "image/png";
      logoDataUrl = `data:${mime};base64,${buf.toString("base64")}`;
    } catch (e) {
      console.error("[export] logo load failed:", e);
      logoDataUrl = null;
    }
  }

  const zip = new JSZip();

  zip.file(
    "daten.json",
    JSON.stringify(
      { exportedAt: new Date().toISOString(), customer },
      null,
      2
    )
  );

  zip.file(
    "kunde.csv",
    toCsv(
      ["id", "name", "company", "email", "phone", "address", "taxId", "notes", "createdAt", "updatedAt"],
      [[
        customer.id,
        customer.name,
        customer.company,
        customer.email,
        customer.phone,
        customer.address,
        customer.taxId,
        customer.notes,
        isoDate(customer.createdAt),
        isoDate(customer.updatedAt),
      ]]
    )
  );

  zip.file(
    "leistungsumfang.csv",
    toCsv(
      ["id", "title", "details", "quantity", "unitPrice", "done", "order", "createdAt"],
      customer.scopeItems.map((i) => [
        i.id,
        i.title,
        i.details,
        i.quantity,
        i.unitPrice,
        i.done,
        i.order,
        isoDate(i.createdAt),
      ])
    )
  );

  zip.file(
    "kosten.csv",
    toCsv(
      ["id", "description", "amount", "frequency", "dueDate", "createdAt"],
      customer.costs.map((c) => [
        c.id,
        c.description,
        c.amount,
        c.frequency,
        isoDate(c.dueDate),
        isoDate(c.createdAt),
      ])
    )
  );

  zip.file(
    "rechnungen.csv",
    toCsv(
      ["nummer", "datum", "faellig", "status", "netto", "mwstSatz", "mwst", "brutto", "notizen"],
      customer.invoices.map((inv) => [
        inv.number,
        isoDate(inv.date),
        isoDate(inv.dueDate),
        inv.status,
        inv.subtotal,
        inv.vatRate,
        inv.vatAmount,
        inv.total,
        inv.notes,
      ])
    )
  );

  zip.file(
    "belege.csv",
    toCsv(
      ["datei", "datum", "netto", "mwst", "brutto", "status", "uploadedAt"],
      customer.uploadedInvoices.map((u) => [
        u.filename,
        isoDate(u.extractedDate),
        u.extractedNet,
        u.extractedVat,
        u.extractedTotal,
        u.status,
        isoDate(u.uploadedAt),
      ])
    )
  );

  for (const inv of customer.invoices) {
    try {
      const pdfBuffer = await renderToBuffer(
        InvoicePdf({
          business: {
            name: settings.businessName,
            address: settings.businessAddress,
            email: settings.businessEmail,
            phone: settings.businessPhone,
            taxId: settings.taxId,
            iban: settings.iban,
            bic: settings.bic,
            bankName: settings.bankName,
            logoDataUrl,
            layoutPrimary: settings.invoiceLayoutPrimary,
            layoutAccent: settings.invoiceLayoutAccent,
            footer: settings.invoiceFooter,
            paymentTermsDays: settings.paymentTermsDays,
          },
          customer: {
            name: customer.name,
            company: customer.company,
            address: customer.address,
            taxId: customer.taxId,
          },
          invoice: {
            number: inv.number,
            date: inv.date,
            dueDate: inv.dueDate,
            items: inv.items.map((it) => ({
              description: it.description,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              total: it.total,
            })),
            subtotal: inv.subtotal,
            vatRate: inv.vatRate,
            vatAmount: inv.vatAmount,
            total: inv.total,
            notes: inv.notes,
          },
        })
      );
      zip.file(`rechnungen/Rechnung-${safePart(inv.number)}.pdf`, pdfBuffer);
    } catch {
      // skip invoices that fail to render
    }
  }

  for (const u of customer.uploadedInvoices) {
    try {
      let buf: Buffer;
      if (u.path.startsWith("http://") || u.path.startsWith("https://")) {
        const res = await fetch(u.path);
        if (!res.ok) throw new Error(`beleg fetch ${res.status}`);
        buf = Buffer.from(await res.arrayBuffer());
      } else {
        const relative = u.path.startsWith("/") ? u.path.slice(1) : u.path;
        const filePath = path.join(process.cwd(), "public", relative);
        buf = await fs.readFile(filePath);
      }
      zip.file(`belege/${safePart(u.filename)}`, buf);
    } catch (e) {
      console.error("[export] beleg fetch failed:", u.path, e);
    }
  }

  const readme = [
    `Export für: ${customer.name}${customer.company ? ` (${customer.company})` : ""}`,
    `Erstellt: ${new Date().toLocaleString("de-DE")}`,
    ``,
    `Inhalt:`,
    `- daten.json   — vollständiger Datendump (JSON)`,
    `- kunde.csv, leistungsumfang.csv, kosten.csv, rechnungen.csv, belege.csv`,
    `- rechnungen/  — eigene Rechnungen als PDF`,
    `- belege/      — hochgeladene Belege (Originaldateien)`,
    ``,
  ].join("\n");
  zip.file("README.txt", readme);

  const out = await zip.generateAsync({ type: "nodebuffer" });
  const datePart = new Date().toISOString().slice(0, 10);
  const filename = `fylu-export-${slug(customer.name)}-${datePart}.zip`;

  return new NextResponse(new Uint8Array(out), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
