import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { extractPdfText } from "@/lib/pdf-extract";
import { parseScopeText } from "@/lib/scope-parse";
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

  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    return NextResponse.json({ error: "Nur PDFs erlaubt." }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());

  const safeName = file.name.replace(/[^a-zA-Z0-9_.\- ]/g, "_");
  const key = `scope/${customerId}/${Date.now()}-${safeName}`;
  const { url: publicPath } = await saveUpload(key, buf, "application/pdf");

  let text = "";
  try {
    text = await extractPdfText(buf);
  } catch (e) {
    console.error("[upload-scope] extractPdfText failed:", e);
    text = "";
  }

  const parsed = text
    ? await parseScopeText(text)
    : { items: [], source: "heuristic" as const };

  const maxOrder = await prisma.customerScopeItem.aggregate({
    where: { customerId },
    _max: { order: true },
  });
  let nextOrder = (maxOrder._max.order ?? -1) + 1;

  const created = [];
  for (const item of parsed.items) {
    const scope = await prisma.customerScopeItem.create({
      data: {
        customerId,
        title: item.title,
        details: item.details,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        order: nextOrder++,
      },
    });
    created.push(scope);
  }

  await prisma.customer.updateMany({
    where: { id: customerId, workspaceId },
    data: {
      scopeDocumentPath: publicPath,
      scopeDocumentFilename: file.name,
      scopeDocumentUploadedAt: new Date(),
      processScopeDefined: parsed.items.length > 0 ? true : customer.processScopeDefined,
      updatedAt: new Date(),
    },
  });

  revalidatePath(`/kunden/${customerId}`);

  return NextResponse.json({
    parsedCount: created.length,
    source: parsed.source,
    filename: file.name,
    path: publicPath,
  });
}
