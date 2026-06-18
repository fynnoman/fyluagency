"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const STATUSES = ["new", "contacted", "meeting", "proposal", "won", "lost"] as const;
export type LeadStatus = (typeof STATUSES)[number];

export async function createLead(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Name fehlt");
  const valueRaw = String(formData.get("expectedValue") || "").trim();
  const value = valueRaw ? Number(valueRaw.replace(",", ".")) : null;

  const lead = await prisma.lead.create({
    data: {
      name,
      company: str(formData, "company"),
      email: str(formData, "email"),
      phone: str(formData, "phone"),
      source: str(formData, "source"),
      expectedValue: Number.isFinite(value) ? value : null,
      notes: str(formData, "notes"),
      status: "new",
    },
  });
  revalidatePath("/leads");
  redirect(`/leads/${lead.id}`);
}

export async function updateLead(id: string, formData: FormData) {
  const valueRaw = String(formData.get("expectedValue") || "").trim();
  const value = valueRaw ? Number(valueRaw.replace(",", ".")) : null;

  await prisma.lead.update({
    where: { id },
    data: {
      name: String(formData.get("name") || "").trim() || undefined,
      company: str(formData, "company"),
      email: str(formData, "email"),
      phone: str(formData, "phone"),
      source: str(formData, "source"),
      expectedValue: Number.isFinite(value) ? value : null,
      notes: str(formData, "notes"),
      lastContactAt: new Date(),
    },
  });
  revalidatePath(`/leads/${id}`);
  revalidatePath("/leads");
}

export async function moveLeadStatus(id: string, status: LeadStatus) {
  if (!STATUSES.includes(status)) return;
  await prisma.lead.update({
    where: { id },
    data: { status, lastContactAt: new Date() },
  });
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
}

export async function deleteLead(id: string) {
  await prisma.lead.delete({ where: { id } });
  revalidatePath("/leads");
  redirect("/leads");
}

export async function convertLeadToCustomer(id: string) {
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return;
  const customer = await prisma.customer.create({
    data: {
      name: lead.name,
      company: lead.company,
      email: lead.email,
      phone: lead.phone,
      notes: lead.notes
        ? `Aus Lead konvertiert. Quelle: ${lead.source || "—"}\n\n${lead.notes}`
        : `Aus Lead konvertiert. Quelle: ${lead.source || "—"}`,
    },
  });
  await prisma.lead.update({
    where: { id },
    data: { status: "won", lastContactAt: new Date() },
  });
  revalidatePath("/kunden");
  revalidatePath("/leads");
  redirect(`/kunden/${customer.id}`);
}

function str(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) || "").trim();
  return v === "" ? null : v;
}
