import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { extractPdfText, extractTotalsFromText } from "@/lib/pdf-extract";
import { saveUpload } from "@/lib/storage";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const customerId = String(form.get("customerId") || "");
  const file = form.get("file") as File | null;

  if (!customerId || !file) {
    return NextResponse.json(
      { error: "customerId und Datei sind erforderlich." },
      { status: 400 },
    );
  }

  const workspaceId = await getCurrentWorkspaceId();
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, workspaceId },
  });
  if (!customer) {
    return NextResponse.json({ error: "Kunde nicht gefunden." }, { status: 404 });
  }

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Nur PDFs erlaubt." }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9_.\- ]/g, "_");
  const key = `offers/${customerId}/${Date.now()}-${safeName}`;
  const { url: publicPath } = await saveUpload(key, buf, "application/pdf");

  let text = "";
  try {
    text = await extractPdfText(buf);
  } catch (e) {
    console.error("[upload-offer] extractPdfText failed:", e);
    text = "";
  }

  const parsed = text
    ? await extractTotalsFromText(text)
    : { total: null, net: null, vat: null, date: null, source: "heuristic" as const };

  const offerAmount = parsed.total ?? parsed.net ?? null;

  await prisma.customer.updateMany({
    where: { id: customerId, workspaceId },
    data: {
      offerDocumentPath: publicPath,
      offerDocumentFilename: file.name,
      offerDocumentUploadedAt: new Date(),
      offerAmount,
      processOfferAccepted: true,
      updatedAt: new Date(),
    },
  });

  revalidatePath(`/kunden/${customerId}`);

  return NextResponse.json({
    offerAmount,
    source: parsed.source,
    filename: file.name,
    path: publicPath,
  });
}
