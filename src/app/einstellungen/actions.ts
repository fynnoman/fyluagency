"use server";

import { revalidatePath } from "next/cache";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { ping as openaiPing } from "@/lib/openai";

export async function saveSettings(formData: FormData) {
  await getSettings(); // ensure singleton exists

  const num = (key: string, fallback: number) => {
    const v = String(formData.get(key) || "").trim();
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : fallback;
  };

  await prisma.settings.update({
    where: { id: 1 },
    data: {
      businessName: String(formData.get("businessName") || "").trim() || "Fylu Marketing & Design",
      businessAddress: String(formData.get("businessAddress") || ""),
      businessEmail: String(formData.get("businessEmail") || ""),
      businessPhone: String(formData.get("businessPhone") || ""),
      taxId: String(formData.get("taxId") || ""),
      iban: String(formData.get("iban") || ""),
      bic: String(formData.get("bic") || ""),
      bankName: String(formData.get("bankName") || ""),
      vatRate: num("vatRate", 19),
      paymentTermsDays: Math.max(0, Math.round(num("paymentTermsDays", 14))),
      invoiceNumberPrefix: String(formData.get("invoiceNumberPrefix") || "RE"),
      invoiceFooter: String(formData.get("invoiceFooter") || ""),
      invoiceLayoutPrimary: String(formData.get("invoiceLayoutPrimary") || "#0B0B0E"),
      invoiceLayoutAccent: String(formData.get("invoiceLayoutAccent") || "#1F2937"),
      ollamaModel: String(formData.get("ollamaModel") || "llama3.2"),
      ollamaBaseUrl: String(formData.get("ollamaBaseUrl") || "http://localhost:11434"),
      openAIApiKey:
        String(formData.get("openAIApiKey") || "").trim() || null,
      openAIModel: String(formData.get("openAIModel") || "gpt-4o-mini"),
    },
  });

  revalidatePath("/einstellungen");
  revalidatePath("/");
}

export async function uploadLogo(formData: FormData) {
  const file = formData.get("logo") as File | null;
  if (!file || file.size === 0) throw new Error("Keine Datei");

  const allowedMime = ["image/png", "image/jpeg", "image/svg+xml"];
  if (!allowedMime.includes(file.type)) {
    throw new Error(`Format ${file.type} nicht unterstützt. PNG, JPG oder SVG nutzen.`);
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/svg+xml"
        ? "svg"
        : "jpg";
  const filename = `logo-${Date.now()}.${ext}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });
  const filepath = path.join(uploadsDir, filename);
  await fs.writeFile(filepath, buf);

  // Delete old logo file if present
  await getSettings();
  const current = await prisma.settings.findUnique({ where: { id: 1 } });
  if (current?.logoPath) {
    try {
      await fs.unlink(path.join(process.cwd(), "public", current.logoPath));
    } catch {
      /* ignore */
    }
  }

  await prisma.settings.update({
    where: { id: 1 },
    data: { logoPath: `/uploads/${filename}` },
  });

  revalidatePath("/einstellungen");
}

export async function testOpenAI(): Promise<{ ok: boolean; message: string }> {
  const settings = await getSettings();
  const envKey = process.env.OPENAI_API_KEY;
  const key = envKey || settings.openAIApiKey || "";
  if (!key) {
    return { ok: false, message: "Kein OpenAI-Key hinterlegt (weder Env noch DB)." };
  }
  const model = process.env.OPENAI_MODEL || settings.openAIModel;
  const ok = await openaiPing(key, model);
  const source = envKey ? "Env" : "DB";
  return {
    ok,
    message: ok
      ? `OpenAI erreichbar (Modell ${model}, Key aus ${source}).`
      : `OpenAI antwortet nicht (Key aus ${source}). Key oder Modell prüfen.`,
  };
}

export async function removeLogo() {
  const current = await prisma.settings.findUnique({ where: { id: 1 } });
  if (current?.logoPath) {
    try {
      await fs.unlink(path.join(process.cwd(), "public", current.logoPath));
    } catch {
      /* ignore */
    }
  }
  await prisma.settings.update({
    where: { id: 1 },
    data: { logoPath: null },
  });
  revalidatePath("/einstellungen");
}
