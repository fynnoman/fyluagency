import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import PageHeader from "@/components/PageHeader";
import { formatMoney, formatDate } from "@/lib/format";
import { Plus, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type SearchParams = Promise<{ page?: string }>;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const workspaceId = await getCurrentWorkspaceId();
  const [customers, totalCount] = await Promise.all([
    prisma.customer.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.customer.count({ where: { workspaceId } }),
  ]);

  // Aggregate revenue per customer once, only for the customers on this page.
  const customerIds = customers.map((c) => c.id);
  const revenueRows = customerIds.length
    ? await prisma.invoice.groupBy({
        by: ["customerId"],
        where: { workspaceId, customerId: { in: customerIds } },
        _sum: { total: true },
      })
    : [];
  const revenueByCustomer = new Map<string, number>();
  for (const r of revenueRows) {
    revenueByCustomer.set(r.customerId, r._sum.total ?? 0);
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const PROCESS_STEPS_TOTAL = 7;
  function processDone(c: (typeof customers)[number]) {
    return (
      Number(c.processOfferAccepted) +
      Number(c.processScopeDefined) +
      Number(c.processPreferencesCollected) +
      Number(c.processDownPaymentPaid) +
      Number(c.processProjectCompleted) +
      Number(c.processFinalInvoicePaid) +
      Number(c.processReferenceCollected)
    );
  }

  return (
    <>
      <PageHeader
        title="Kunden"
        subtitle={`${totalCount} Kunden gesamt · Seite ${page} von ${totalPages}`}
        actions={
          <Link href="/kunden/neu" className="btn btn-primary">
            <Plus size={14} /> Neuer Kunde
          </Link>
        }
      />

      {customers.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-text-muted">
            Noch keine Kunden angelegt. Leg deinen ersten Kunden an.
          </p>
          <Link href="/kunden/neu" className="btn btn-primary mt-4 inline-flex">
            <Plus size={14} /> Neuer Kunde
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>Firma</th>
                <th>Prozess</th>
                <th>Umsatz gesamt</th>
                <th>Angelegt</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const revenue = revenueByCustomer.get(c.id) ?? 0;
                return (
                  <tr key={c.id}>
                    <td>
                      <Link
                        href={`/kunden/${c.id}`}
                        className="font-medium hover:text-accent"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="text-text-muted">{c.company || "—"}</td>
                    <td>
                      {(() => {
                        const d = processDone(c);
                        if (d === PROCESS_STEPS_TOTAL) {
                          return (
                            <span className="pill pill-positive">
                              Abgeschlossen
                            </span>
                          );
                        }
                        if (d === 0) {
                          return (
                            <span className="pill">Nicht gestartet</span>
                          );
                        }
                        return (
                          <span className="pill pill-warning">
                            {d}/{PROCESS_STEPS_TOTAL}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="tabular-nums">{formatMoney(revenue)}</td>
                    <td className="text-text-muted">{formatDate(c.createdAt)}</td>
                    <td>
                      <Link
                        href={`/kunden/${c.id}`}
                        className="btn btn-ghost"
                        aria-label={`${c.name} öffnen`}
                      >
                        <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="text-text-muted">
            {skip + 1}–{Math.min(skip + customers.length, totalCount)} von{" "}
            {totalCount}
          </div>
          <div className="flex items-center gap-1">
            {page > 1 ? (
              <Link
                href={`/kunden?page=${page - 1}`}
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
                href={`/kunden?page=${page + 1}`}
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
