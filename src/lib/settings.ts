import { prisma } from "./prisma";

/** Lazy-create the singleton settings row if it doesn't exist yet. */
export async function getSettings() {
  let settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings) {
    settings = await prisma.settings.create({ data: { id: 1 } });
  }
  return settings;
}

export async function nextInvoiceNumber() {
  const settings = await getSettings();
  const year = new Date().getFullYear();
  const counter = String(settings.invoiceNumberCounter).padStart(4, "0");
  const number = `${settings.invoiceNumberPrefix}-${year}-${counter}`;
  await prisma.settings.update({
    where: { id: 1 },
    data: { invoiceNumberCounter: { increment: 1 } },
  });
  return number;
}
