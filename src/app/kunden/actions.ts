"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export async function createCustomer(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Name fehlt");
  const workspaceId = await getCurrentWorkspaceId();

  const customer = await prisma.customer.create({
    data: {
      workspaceId,
      name,
      company: str(formData, "company"),
      email: str(formData, "email"),
      phone: str(formData, "phone"),
      address: str(formData, "address"),
      taxId: str(formData, "taxId"),
      notes: str(formData, "notes"),
      projectValue: num(formData, "projectValue"),
    },
  });
  revalidatePath("/kunden");
  revalidatePath("/");
  redirect(`/kunden/${customer.id}`);
}

export async function updateCustomer(id: string, formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  await prisma.customer.updateMany({
    where: { id, workspaceId },
    data: {
      name: String(formData.get("name") || "").trim() || undefined,
      company: str(formData, "company"),
      email: str(formData, "email"),
      phone: str(formData, "phone"),
      address: str(formData, "address"),
      taxId: str(formData, "taxId"),
      notes: str(formData, "notes"),
      projectValue: num(formData, "projectValue"),
    },
  });
  revalidatePath(`/kunden/${id}`);
  revalidatePath("/kunden");
  revalidatePath("/");
}

export async function deleteCustomer(id: string) {
  const workspaceId = await getCurrentWorkspaceId();
  await prisma.customer.deleteMany({ where: { id, workspaceId } });
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
  const workspaceId = await getCurrentWorkspaceId();
  await prisma.customer.updateMany({
    where: { id: customerId, workspaceId },
    data: { [field]: next, updatedAt: new Date() },
  });
  revalidatePath(`/kunden/${customerId}`);
}

// Manuelle Leistungsposition anlegen (Alternative zum PDF-Upload).
export async function addScopeItem(customerId: string, formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  if (!title) return;
  const workspaceId = await getCurrentWorkspaceId();
  // Sicherstellen dass der Kunde zum aktuellen Workspace gehört
  const owned = await prisma.customer.findFirst({
    where: { id: customerId, workspaceId },
    select: { id: true },
  });
  if (!owned) return;
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
  const workspaceId = await getCurrentWorkspaceId();
  const item = await prisma.customerScopeItem.findFirst({
    where: { id, customer: { workspaceId } },
  });
  if (!item) return;
  await prisma.customerScopeItem.update({
    where: { id },
    data: { done: !item.done },
  });
  revalidatePath(`/kunden/${customerId}`);
}

export async function deleteScopeItem(id: string, customerId: string) {
  const workspaceId = await getCurrentWorkspaceId();
  await prisma.customerScopeItem.deleteMany({
    where: { id, customer: { workspaceId } },
  });
  revalidatePath(`/kunden/${customerId}`);
}

export async function addCost(customerId: string, formData: FormData) {
  const description = String(formData.get("description") || "").trim();
  const amountRaw = String(formData.get("amount") || "").trim();
  const amount = Number(amountRaw.replace(",", "."));
  if (!description || !Number.isFinite(amount)) return;
  const workspaceId = await getCurrentWorkspaceId();
  const owned = await prisma.customer.findFirst({
    where: { id: customerId, workspaceId },
    select: { id: true },
  });
  if (!owned) return;
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
  const workspaceId = await getCurrentWorkspaceId();
  await prisma.cost.deleteMany({
    where: { id, customer: { workspaceId } },
  });
  revalidatePath(`/kunden/${customerId}`);
}

function str(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) || "").trim();
  return v === "" ? null : v;
}

function num(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) || "").trim();
  if (raw === "") return null;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
