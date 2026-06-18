"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings, nextInvoiceNumber } from "@/lib/settings";
import { parseInvoiceText, type ParsedItem } from "@/lib/invoice-parse";

export async function parseFromText(text: string): Promise<{
  items: ParsedItem[];
  source: "ollama" | "heuristic";
}> {
  return parseInvoiceText(text);
}

export type CreateInvoiceInput = {
  customerId: string;
  items: ParsedItem[];
  date?: string; // ISO yyyy-mm-dd
  vatRate?: number;
  notes?: string;
};

export async function createInvoice(input: CreateInvoiceInput) {
  if (!input.customerId) throw new Error("Kein Kunde gewählt");
  if (!input.items.length) throw new Error("Keine Positionen");

  const settings = await getSettings();
  const vatRate = input.vatRate ?? settings.vatRate;
  const subtotal = input.items.reduce(
    (s, it) => s + it.quantity * it.unitPrice,
    0
  );
  const vatAmount = round2((subtotal * vatRate) / 100);
  const total = round2(subtotal + vatAmount);
  const number = await nextInvoiceNumber();

  const date = input.date ? new Date(input.date) : new Date();
  const dueDate = new Date(date);
  dueDate.setDate(dueDate.getDate() + settings.paymentTermsDays);

  const invoice = await prisma.invoice.create({
    data: {
      customerId: input.customerId,
      number,
      date,
      dueDate,
      vatRate,
      subtotal: round2(subtotal),
      vatAmount,
      total,
      notes: input.notes ?? null,
      items: {
        create: input.items.map((it, idx) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: round2(it.unitPrice),
          total: round2(it.quantity * it.unitPrice),
          order: idx,
        })),
      },
    },
  });

  revalidatePath("/rechnungen");
  revalidatePath(`/kunden/${input.customerId}`);
  return invoice.id;
}

export async function updateInvoiceStatus(
  id: string,
  status: "draft" | "sent" | "paid" | "overdue"
) {
  await prisma.invoice.update({
    where: { id },
    data: {
      status,
      paidAt: status === "paid" ? new Date() : null,
    },
  });
  revalidatePath(`/rechnungen/${id}`);
  revalidatePath("/rechnungen");
}

export async function deleteInvoice(id: string) {
  const inv = await prisma.invoice.findUnique({ where: { id } });
  await prisma.invoice.delete({ where: { id } });
  revalidatePath("/rechnungen");
  if (inv) revalidatePath(`/kunden/${inv.customerId}`);
  redirect("/rechnungen");
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
