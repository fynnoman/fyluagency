import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractPdfText, extractTotalsFromText } from "@/lib/pdf-extract";
import { saveUpload } from "@/lib/storage";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const customerId = String(form.get("customerId") || "");
  const file = form.get("file") as File | null;

  if (!customerId || !file) {
    return NextResponse.json({ error: "customerId and file required" }, { status: 400 });
  }

  const workspaceId = await getCurrentWorkspaceId();
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, workspaceId },
  });
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF allowed" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());

  const safeName = file.name.replace(/[^a-zA-Z0-9_.\- ]/g, "_");
  const key = `invoices/${customerId}/${Date.now()}-${safeName}`;
  const { url: publicPath } = await saveUpload(key, buf, "application/pdf");

  // Extract text
  let text = "";
  try {
    text = await extractPdfText(buf);
  } catch (e) {
    console.error("[upload-invoice] extractPdfText failed:", e);
    text = "";
  }

  // Extract totals
  const parsed = text
    ? await extractTotalsFromText(text)
    : { total: null, net: null, vat: null, date: null, source: "heuristic" as const };

  const saved = await prisma.uploadedInvoice.create({
    data: {
      customerId,
      filename: file.name,
      path: publicPath,
      extractedTotal: parsed.total ?? null,
      extractedNet: parsed.net ?? null,
      extractedVat: parsed.vat ?? null,
      extractedDate: parsed.date ?? null,
      extractedRaw: text.slice(0, 4000) || null,
      status: parsed.total != null ? "parsed" : "manual",
    },
  });

  return NextResponse.json({
    id: saved.id,
    extractedTotal: parsed.total,
    extractedNet: parsed.net,
    extractedVat: parsed.vat,
    extractedDate: parsed.date,
    source: parsed.source,
  });
}
