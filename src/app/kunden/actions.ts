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

export async function addIssue(customerId: string, formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  if (!title) return;
  const priceRaw = String(formData.get("price") || "").trim();
  const price = priceRaw ? Number(priceRaw.replace(",", ".")) : null;
  await prisma.issue.create({
    data: {
      customerId,
      title,
      description: str(formData, "description"),
      price: Number.isFinite(price) ? price : null,
    },
  });
  revalidatePath(`/kunden/${customerId}`);
}

export async function toggleIssue(id: string, customerId: string) {
  const issue = await prisma.issue.findUnique({ where: { id } });
  if (!issue) return;
  await prisma.issue.update({
    where: { id },
    data: {
      done: !issue.done,
      doneAt: !issue.done ? new Date() : null,
    },
  });
  revalidatePath(`/kunden/${customerId}`);
}

export async function deleteIssue(id: string, customerId: string) {
  await prisma.issue.delete({ where: { id } });
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
