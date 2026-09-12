import Link from "next/link";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import PageHeader from "@/components/PageHeader";
import { formatMoney, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

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

type SearchParams = Promise<{ page?: string }>;

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const workspaceId = await getCurrentWorkspaceId();
  const [invoices, totalCount, totalAgg, paidAgg] = await Promise.all([
    prisma.invoice.findMany({
      where: { workspaceId },
      orderBy: { date: "desc" },
      skip,
      take: PAGE_SIZE,
      include: { customer: { select: { id: true, name: true } } },
    }),
    prisma.invoice.count({ where: { workspaceId } }),
    prisma.invoice.aggregate({ _sum: { total: true }, where: { workspaceId } }),
    prisma.invoice.aggregate({
      _sum: { total: true },
      where: { workspaceId, status: "paid" },
    }),
  ]);

  const totalAll = totalAgg._sum.total ?? 0;
  const totalPaid = paidAgg._sum.total ?? 0;
  const totalOpen = totalAll - totalPaid;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Rechnungen"
        subtitle={`${totalCount} Rechnungen · ${formatMoney(totalAll)} gesamt · Seite ${page} von ${totalPages}`}
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

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="text-text-muted">
            {skip + 1}–{Math.min(skip + invoices.length, totalCount)} von{" "}
            {totalCount}
          </div>
          <div className="flex items-center gap-1">
            {page > 1 ? (
              <Link
                href={`/rechnungen?page=${page - 1}`}
                className="btn btn-ghost"
                aria-label="Vorherige Seite"
              >
                <ChevronLeft size={14} />
              </Link>
            ) : (
              <span className="btn btn-ghost opacity-40 pointer-events-none">
                <ChevronLeft size={14} />
              </span>
            )}
            <span className="px-3 tabular-nums text-text-muted">
              {page} / {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={`/rechnungen?page=${page + 1}`}
                className="btn btn-ghost"
                aria-label="Nächste Seite"
              >
                <ChevronRight size={14} />
              </Link>
            ) : (
              <span className="btn btn-ghost opacity-40 pointer-events-none">
                <ChevronRight size={14} />
              </span>
            )}
          </div>
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
