import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { InvoicePdf } from "@/lib/invoice-pdf";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Params) {
  const { id } = await ctx.params;
  const [invoice, settings] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { orderBy: { order: "asc" } },
      },
    }),
    getSettings(),
  ]);

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Load logo as data URL if present (supports both Blob https URLs and local paths)
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
      console.error("[invoice-pdf] logo load failed:", e);
      logoDataUrl = null;
    }
  }

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
        name: invoice.customer.name,
        company: invoice.customer.company,
        address: invoice.customer.address,
        taxId: invoice.customer.taxId,
      },
      invoice: {
        number: invoice.number,
        date: invoice.date,
        dueDate: invoice.dueDate,
        items: invoice.items.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          total: it.total,
        })),
        subtotal: invoice.subtotal,
        vatRate: invoice.vatRate,
        vatAmount: invoice.vatAmount,
        total: invoice.total,
        notes: invoice.notes,
      },
    })
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Rechnung-${invoice.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
