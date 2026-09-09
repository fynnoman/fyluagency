import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { extractPdfText } from "@/lib/pdf-extract";
import { parseScopeText } from "@/lib/scope-parse";

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

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
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

  const dir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "scope",
    customerId,
  );
  await fs.mkdir(dir, { recursive: true });
  const safeName = file.name.replace(/[^a-zA-Z0-9_.\- ]/g, "_");
  const filename = `${Date.now()}-${safeName}`;
  const filepath = path.join(dir, filename);
  await fs.writeFile(filepath, buf);
  const publicPath = `/uploads/scope/${customerId}/${filename}`;

  let text = "";
  try {
    text = await extractPdfText(buf);
  } catch {
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

  await prisma.customer.update({
    where: { id: customerId },
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
