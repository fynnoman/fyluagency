import { cache } from "react";
import { prisma } from "./prisma";
import { getCurrentWorkspaceId } from "./workspace";

/** Lazy-create the settings row for the current workspace if missing.
 *  Wrapped in React cache() so repeated calls within one server render
 *  share a single DB round-trip. */
export const getSettings = cache(async () => {
  const workspaceId = await getCurrentWorkspaceId();
  let settings = await prisma.settings.findUnique({ where: { workspaceId } });
  if (!settings) {
    settings = await prisma.settings.create({ data: { workspaceId } });
  }
  return settings;
});

export async function nextInvoiceNumber() {
  const settings = await getSettings();
  const year = new Date().getFullYear();
  const counter = String(settings.invoiceNumberCounter).padStart(4, "0");
  const number = `${settings.invoiceNumberPrefix}-${year}-${counter}`;
  await prisma.settings.update({
    where: { workspaceId: settings.workspaceId },
    data: { invoiceNumberCounter: { increment: 1 } },
  });
  return number;
}
