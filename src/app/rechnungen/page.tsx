import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import { formatMoney, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_PILL: Record<string, string> = {
  draft: "pill",
  sent: "pill pill-info",
  paid: "pill pill-positive",
  overdue: "pill pill-negative",
};
const STATUS_LABEL: Record<string, string> = {
  draft: "Entwurf",
  sent: "verschickt",
  paid: "bezahlt",
  overdue: "überfällig",
};

export default async function InvoicesPage() {
  const invoices = await prisma.invoice.findMany({
    orderBy: { date: "desc" },
    include: { customer: true },
  });

  const totalAll = invoices.reduce((s, i) => s + i.total, 0);
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0);
  const totalOpen = invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + i.total, 0);

  return (
    <>
      <PageHeader
        title="Rechnungen"
        subtitle={`${invoices.length} Rechnungen · ${formatMoney(totalAll)} gesamt`}
        actions={
          <Link href="/rechnungen/neu" className="btn btn-primary">
            <Plus size={14} /> Neue Rechnung
          </Link>
        }
      />

      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <Kpi label="Bezahlt" value={formatMoney(totalPaid)} color="positive" />
        <Kpi label="Offen" value={formatMoney(totalOpen)} color="warning" />
        <Kpi label="Gesamt brutto" value={formatMoney(totalAll)} />
      </div>

      {invoices.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-text-muted">Noch keine Rechnungen — leg deine erste an.</p>
          <Link href="/rechnungen/neu" className="btn btn-primary mt-4 inline-flex">
            <Plus size={14} /> Neue Rechnung
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="tbl">
            <thead>
              <tr>
                <th>Nr.</th>
                <th>Kunde</th>
                <th>Datum</th>
                <th>Fällig</th>
                <th>Status</th>
                <th>Netto</th>
                <th>MwSt.</th>
                <th>Brutto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="font-mono text-xs">{inv.number}</td>
                  <td>
                    <Link href={`/kunden/${inv.customerId}`} className="hover:text-accent">
                      {inv.customer.name}
                    </Link>
                  </td>
                  <td>{formatDate(inv.date)}</td>
                  <td>{formatDate(inv.dueDate)}</td>
                  <td>
                    <span className={STATUS_PILL[inv.status] || "pill"}>
                      {STATUS_LABEL[inv.status] || inv.status}
                    </span>
                  </td>
                  <td className="tabular-nums">{formatMoney(inv.subtotal)}</td>
                  <td className="tabular-nums text-text-muted">{formatMoney(inv.vatAmount)}</td>
                  <td className="tabular-nums font-medium">{formatMoney(inv.total)}</td>
                  <td>
                    <Link href={`/rechnungen/${inv.id}`} className="text-accent text-xs">
                      öffnen →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide text-text-muted">{label}</div>
      <div
        className={`mt-1 text-xl font-semibold tabular-nums ${
          color === "positive"
            ? "text-positive"
            : color === "warning"
              ? "text-warning"
              : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
