import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import { formatMoney, formatDate } from "@/lib/format";
import { Plus, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      issues: { where: { done: false } },
      invoices: { select: { total: true, status: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Kunden"
        subtitle={`${customers.length} aktive Kunden`}
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
                <th>Offene Aufgaben</th>
                <th>Umsatz gesamt</th>
                <th>Angelegt</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const revenue = c.invoices.reduce(
                  (s, i) => s + i.total,
                  0
                );
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
                      {c.issues.length === 0 ? (
                        <span className="pill pill-positive">Fertig</span>
                      ) : (
                        <span className="pill pill-warning">
                          {c.issues.length} offen
                        </span>
                      )}
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
    </>
  );
}
