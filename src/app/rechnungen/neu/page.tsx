import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import PageHeader from "@/components/PageHeader";
import InvoiceComposer from "./InvoiceComposer";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ customerId?: string }>;

export default async function NewInvoicePage(props: {
  searchParams: SearchParams;
}) {
  const { customerId } = await props.searchParams;
  const workspaceId = await getCurrentWorkspaceId();
  const [customers, settings] = await Promise.all([
    prisma.customer.findMany({
      where: { workspaceId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, company: true },
    }),
    getSettings(),
  ]);

  return (
    <>
      <Link
        href="/rechnungen"
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text mb-3"
      >
        <ChevronLeft size={14} /> Alle Rechnungen
      </Link>
      <PageHeader
        title="Neue Rechnung"
        subtitle="Beschreib die Leistungen in normalem Text — die lokale KI macht Posten daraus."
      />

      {customers.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-text-muted">
            Du brauchst erst einen Kunden, bevor du Rechnungen erstellen kannst.
          </p>
          <Link href="/kunden/neu" className="btn btn-primary mt-4 inline-flex">
            Kunde anlegen
          </Link>
        </div>
      ) : (
        <InvoiceComposer
          customers={customers}
          preselectedCustomerId={customerId}
          defaultVatRate={settings.vatRate}
        />
      )}
    </>
  );
}
