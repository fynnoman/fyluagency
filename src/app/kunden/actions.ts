"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function createCustomer(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Name fehlt");

  const customer = await prisma.customer.create({
    data: {
      name,
      company: str(formData, "company"),
      email: str(formData, "email"),
      phone: str(formData, "phone"),
      address: str(formData, "address"),
      taxId: str(formData, "taxId"),
      notes: str(formData, "notes"),
    },
  });
  revalidatePath("/kunden");
  redirect(`/kunden/${customer.id}`);
}

export async function updateCustomer(id: string, formData: FormData) {
  await prisma.customer.update({
    where: { id },
    data: {
      name: String(formData.get("name") || "").trim() || undefined,
      company: str(formData, "company"),
      email: str(formData, "email"),
      phone: str(formData, "phone"),
      address: str(formData, "address"),
      taxId: str(formData, "taxId"),
      notes: str(formData, "notes"),
    },
  });
  revalidatePath(`/kunden/${id}`);
  revalidatePath("/kunden");
}

export async function deleteCustomer(id: string) {
  await prisma.customer.delete({ where: { id } });
  revalidatePath("/kunden");
  redirect("/kunden");
}

// Ein Schritt in der 7-Punkte-Prozess-Checkliste umschalten.
const PROCESS_FIELDS = new Set([
  "processOfferAccepted",
  "processScopeDefined",
  "processPreferencesCollected",
  "processDownPaymentPaid",
  "processProjectCompleted",
  "processFinalInvoicePaid",
  "processReferenceCollected",
]);

export async function toggleProcessStep(
  customerId: string,
  field: string,
  next: boolean,
) {
  if (!PROCESS_FIELDS.has(field)) return;
  await prisma.customer.update({
    where: { id: customerId },
    data: { [field]: next, updatedAt: new Date() },
  });
  revalidatePath(`/kunden/${customerId}`);
}

// Manuelle Leistungsposition anlegen (Alternative zum PDF-Upload).
export async function addScopeItem(customerId: string, formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  if (!title) return;
  const qtyRaw = String(formData.get("quantity") || "").trim();
  const priceRaw = String(formData.get("unitPrice") || "").trim();
  const quantity = qtyRaw ? Number(qtyRaw.replace(",", ".")) : 1;
  const unitPrice = priceRaw ? Number(priceRaw.replace(",", ".")) : null;
  const max = await prisma.customerScopeItem.aggregate({
    where: { customerId },
    _max: { order: true },
  });
  const nextOrder = (max._max.order ?? -1) + 1;
  await prisma.customerScopeItem.create({
    data: {
      customerId,
      title,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      unitPrice: Number.isFinite(unitPrice as number)
        ? (unitPrice as number)
        : null,
      order: nextOrder,
    },
  });
  revalidatePath(`/kunden/${customerId}`);
}

export async function toggleScopeItem(id: string, customerId: string) {
  const item = await prisma.customerScopeItem.findUnique({ where: { id } });
  if (!item) return;
  await prisma.customerScopeItem.update({
    where: { id },
    data: { done: !item.done },
  });
  revalidatePath(`/kunden/${customerId}`);
}

export async function deleteScopeItem(id: string, customerId: string) {
  await prisma.customerScopeItem.delete({ where: { id } });
  revalidatePath(`/kunden/${customerId}`);
}

export async function addCost(customerId: string, formData: FormData) {
  const description = String(formData.get("description") || "").trim();
  const amountRaw = String(formData.get("amount") || "").trim();
  const amount = Number(amountRaw.replace(",", "."));
  if (!description || !Number.isFinite(amount)) return;
  const dueRaw = String(formData.get("dueDate") || "").trim();
  await prisma.cost.create({
    data: {
      customerId,
      description,
      amount,
      frequency: String(formData.get("frequency") || "once"),
      dueDate: dueRaw ? new Date(dueRaw) : null,
    },
  });
  revalidatePath(`/kunden/${customerId}`);
}

export async function deleteCost(id: string, customerId: string) {
  await prisma.cost.delete({ where: { id } });
  revalidatePath(`/kunden/${customerId}`);
}

function str(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) || "").trim();
  return v === "" ? null : v;
}
