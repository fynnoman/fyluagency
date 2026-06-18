import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, FileDown, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import { formatMoney, formatDate } from "@/lib/format";
import StatusControls from "./StatusControls";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function InvoicePage(props: { params: Params }) {
  const { id } = await props.params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { orderBy: { order: "asc" } },
    },
  });
  if (!invoice) notFound();

  return (
    <>
      <Link
        href="/rechnungen"
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text mb-3"
      >
        <ChevronLeft size={14} /> Alle Rechnungen
      </Link>

      <PageHeader
        title={`Rechnung ${invoice.number}`}
        subtitle={`${invoice.customer.name} · ${formatDate(invoice.date)}`}
        actions={
          <>
            <Link
              href={`/api/invoice/${invoice.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              <FileText size={14} /> Vorschau
            </Link>
            <a
              href={`/api/invoice/${invoice.id}/pdf`}
              download={`Rechnung-${invoice.number}.pdf`}
              className="btn btn-primary"
            >
              <FileDown size={14} /> PDF herunterladen
            </a>
          </>
        }
      />

      <div className="card p-5 mb-6">
        <StatusControls invoiceId={invoice.id} current={invoice.status} />
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
        <section className="card">
          <header className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-sm">Posten</h2>
          </header>
          <table className="tbl">
            <thead>
              <tr>
                <th>Leistung</th>
                <th className="text-right">Anzahl</th>
                <th className="text-right">Einzel</th>
                <th className="text-right">Summe</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((it) => (
                <tr key={it.id}>
                  <td>{it.description}</td>
                  <td className="text-right tabular-nums">{it.quantity}</td>
                  <td className="text-right tabular-nums">{formatMoney(it.unitPrice)}</td>
                  <td className="text-right tabular-nums font-medium">
                    {formatMoney(it.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <footer className="px-5 py-4 border-t border-border space-y-1 text-sm">
            <Row label="Netto" value={formatMoney(invoice.subtotal)} />
            <Row label={`MwSt. (${invoice.vatRate}%)`} value={formatMoney(invoice.vatAmount)} muted />
            <Row label="Brutto" value={formatMoney(invoice.total)} strong />
          </footer>
          {invoice.notes && (
            <div className="px-5 py-4 border-t border-border text-sm text-text-muted">
              {invoice.notes}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="card p-5">
            <h3 className="font-semibold text-sm mb-3">Kunde</h3>
            <div className="text-sm">
              <div className="font-medium">{invoice.customer.name}</div>
              {invoice.customer.company && (
                <div className="text-text-muted">{invoice.customer.company}</div>
              )}
              {invoice.customer.address && (
                <div className="text-text-muted mt-2 whitespace-pre-line">
                  {invoice.customer.address}
                </div>
              )}
            </div>
            <Link
              href={`/kunden/${invoice.customerId}`}
              className="inline-block mt-3 text-xs text-accent hover:underline"
            >
              Kundenakte öffnen →
            </Link>
          </section>

          <section className="card p-5">
            <h3 className="font-semibold text-sm mb-3">Übersicht</h3>
            <Row label="Rechnungsdatum" value={formatDate(invoice.date)} muted />
            <Row label="Fällig" value={formatDate(invoice.dueDate)} muted />
            <Row label="MwSt.-Satz" value={`${invoice.vatRate} %`} muted />
            {invoice.paidAt && (
              <Row label="Bezahlt am" value={formatDate(invoice.paidAt)} muted />
            )}
          </section>
        </aside>
      </div>
    </>
  );
}

function Row({
  label,
  value,
  muted,
  strong,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-1 ${
        strong
          ? "border-t border-border pt-2 mt-1 font-semibold text-base"
          : muted
            ? "text-text-muted"
            : ""
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
