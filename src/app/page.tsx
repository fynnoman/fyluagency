import { Suspense } from "react";
import Link from "next/link";
import { FileText, Sparkles, Users, AlertCircle, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import PageHeader from "@/components/PageHeader";
import { formatMoney, formatDate } from "@/lib/format";
import { parseRange, getRangeStart, RANGE_LABEL, type RangeKey } from "@/lib/range";
import RevenueChart from "./RevenueChart";
import UpsellPanel from "./UpsellPanel";
import GoogleAdsWidget from "./GoogleAdsWidget";

type SearchParams = Promise<{ r?: string }>;

export default async function Dashboard(props: { searchParams: SearchParams }) {
  const sp = await props.searchParams;
  const range = parseRange(sp.r);
  const start = getRangeStart(range);

  const workspaceId = await getCurrentWorkspaceId();
  const where = { workspaceId, ...(start ? { date: { gte: start } } : {}) };
  const [
    invoices,
    customers,
    activeCustomers,
    leadsPipeline,
    potentialLeads,
    potentialCustomers,
  ] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: { date: "asc" },
        take: 500,
        include: { customer: { select: { id: true, name: true } } },
      }),
      prisma.customer.count({ where: { workspaceId } }),
      prisma.customer.findMany({
        where: {
          workspaceId,
          archivedAt: null,
          OR: [
            { processOfferAccepted: true },
            { processScopeDefined: true },
            { processPreferencesCollected: true },
            { processDownPaymentPaid: true },
            { processProjectCompleted: true },
            { processFinalInvoicePaid: true },
          ],
          processReferenceCollected: false,
        },
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
      prisma.lead.findMany({
        where: { workspaceId, status: { in: ["meeting", "proposal", "contacted"] } },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      prisma.lead.findMany({
        where: {
          workspaceId,
          status: { in: ["new", "contacted", "meeting", "proposal"] },
          expectedValue: { not: null },
        },
        select: { expectedValue: true },
      }),
      prisma.customer.findMany({
        where: {
          workspaceId,
          archivedAt: null,
          processFinalInvoicePaid: false,
          projectValue: { not: null },
        },
        select: { projectValue: true },
      }),
    ]);

  const potentialLeadsTotal = potentialLeads.reduce(
    (s, l) => s + (l.expectedValue || 0),
    0,
  );
  const potentialCustomersTotal = potentialCustomers.reduce(
    (s, c) => s + (c.projectValue || 0),
    0,
  );
  const potentialTotal = potentialLeadsTotal + potentialCustomersTotal;

  const PROCESS_STEPS_TOTAL = 7;
  function processDone(c: (typeof activeCustomers)[number]) {
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

  const grossTotal = invoices.reduce((s, i) => s + i.total, 0);
  const netTotal = invoices.reduce((s, i) => s + i.subtotal, 0);
  const vatTotal = invoices.reduce((s, i) => s + i.vatAmount, 0);
  const paidTotal = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + i.total, 0);
  const openTotal = invoices
    .filter((i) => i.status !== "paid")
    .reduce((s, i) => s + i.total, 0);

  const today = new Date();
  const overdue = invoices.filter(
    (i) =>
      i.status !== "paid" &&
      i.dueDate &&
      new Date(i.dueDate).getTime() < today.getTime()
  );

  const chartData = buildChartData(invoices, range);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Übersicht für ${RANGE_LABEL[range].toLowerCase()}.`}
        actions={
          <Link href="/rechnungen/neu" className="btn btn-primary">
            <Plus size={14} /> Neue Rechnung
          </Link>
        }
      />

      <div className="card p-1 inline-flex gap-1 mb-6 text-sm">
        {(Object.keys(RANGE_LABEL) as RangeKey[]).map((k) => (
          <Link
            key={k}
            href={`/?r=${k}`}
            className={`px-3 py-1.5 rounded-md ${
              k === range
                ? "bg-accent text-accent-fg"
                : "text-text-muted hover:bg-surface-2"
            }`}
          >
            {RANGE_LABEL[k]}
          </Link>
        ))}
      </div>

      <div className="card p-5 mb-3 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-text-muted">
            Potenzial gesamt
          </div>
          <div className="mt-1 text-3xl font-semibold tabular-nums">
            {formatMoney(potentialTotal)}
          </div>
          <div className="mt-1 text-xs text-text-muted">
            {potentialLeads.length}{" "}
            {potentialLeads.length === 1 ? "offener Lead" : "offene Leads"} ·{" "}
            {potentialCustomers.length}{" "}
            {potentialCustomers.length === 1
              ? "Kundenprojekt offen"
              : "Kundenprojekte offen"}
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-end text-xs text-text-muted tabular-nums gap-0.5">
          <div>
            Leads <span className="ml-2">{formatMoney(potentialLeadsTotal)}</span>
          </div>
          <div>
            Kunden{" "}
            <span className="ml-2">{formatMoney(potentialCustomersTotal)}</span>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Kpi label="Brutto-Umsatz" value={formatMoney(grossTotal)} accent="primary" />
        <Kpi label="Netto" value={formatMoney(netTotal)} />
        <Kpi label="MwSt." value={formatMoney(vatTotal)} muted />
        <Kpi label="Rechnungen" value={String(invoices.length)} muted />
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
        <div className="space-y-6">
          <section className="card p-5">
            <header className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-sm">Umsatzverlauf</h2>
                <p className="text-xs text-text-muted">Brutto pro Periode</p>
              </div>
            </header>
            {chartData.length > 1 ? (
              <RevenueChart data={chartData} />
            ) : (
              <div className="py-10 text-center text-sm text-text-muted">
                Sobald du mehrere Rechnungen hast, zeigen wir hier den Verlauf.
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-2 mt-4">
              <MiniKpi label="bezahlt" value={formatMoney(paidTotal)} positive />
              <MiniKpi label="offen" value={formatMoney(openTotal)} warn={openTotal > 0} />
            </div>
          </section>

          <Suspense fallback={<WidgetSkeleton title="Wo holst du noch Geld raus?" />}>
            <UpsellPanel />
          </Suspense>

          <Suspense fallback={<WidgetSkeleton title="Google Ads" />}>
            <GoogleAdsWidget />
          </Suspense>

          {overdue.length > 0 && (
            <section className="card">
              <header className="px-5 py-4 border-b border-border flex items-center gap-2 text-negative">
                <AlertCircle size={16} />
                <h2 className="font-semibold text-sm">Überfällige Rechnungen</h2>
              </header>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Nr.</th>
                    <th>Kunde</th>
                    <th>Fällig</th>
                    <th>Brutto</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {overdue.map((i) => (
                    <tr key={i.id}>
                      <td className="font-mono text-xs">{i.number}</td>
                      <td>{i.customer.name}</td>
                      <td className="text-negative">{formatDate(i.dueDate)}</td>
                      <td className="tabular-nums">{formatMoney(i.total)}</td>
                      <td>
                        <Link href={`/rechnungen/${i.id}`} className="text-accent text-xs">
                          öffnen →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="card">
            <header className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <FileText size={14} /> Kunden im Prozess
              </h2>
              <span className="text-xs text-text-muted">
                {activeCustomers.length}
              </span>
            </header>
            {activeCustomers.length === 0 ? (
              <div className="px-5 py-8 text-sm text-text-muted text-center">
                Kein aktives Projekt gerade.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {activeCustomers.map((c) => {
                  const d = processDone(c);
                  return (
                    <li
                      key={c.id}
                      className="px-5 py-3 text-sm flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/kunden/${c.id}`}
                          className="font-medium truncate hover:text-accent"
                        >
                          {c.name}
                        </Link>
                        {c.company && (
                          <div className="text-xs text-text-muted truncate">
                            {c.company}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-text-muted tabular-nums shrink-0">
                        {d}/{PROCESS_STEPS_TOTAL}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="card">
            <header className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Sparkles size={14} /> Leads warten auf dich
              </h2>
              <Link href="/leads" className="text-xs text-accent hover:underline">
                alle →
              </Link>
            </header>
            {leadsPipeline.length === 0 ? (
              <div className="px-5 py-8 text-sm text-text-muted text-center">
                Keine offenen Leads.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {leadsPipeline.map((l) => (
                  <li key={l.id}>
                    <Link
                      href={`/leads/${l.id}`}
                      className="block px-5 py-3 text-sm hover:bg-surface-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium truncate">{l.name}</div>
                        <span className={`pill pill-${l.status === "proposal" ? "warning" : "info"}`}>
                          {l.status}
                        </span>
                      </div>
                      <div className="text-xs text-text-muted mt-0.5 truncate">
                        {l.company || l.source || "—"}
                        {l.expectedValue != null && ` · ${formatMoney(l.expectedValue)}`}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-text-muted" />
              <span>{customers} Kunden aktiv</span>
            </div>
            <Link href="/kunden" className="text-xs text-accent hover:underline">
              verwalten →
            </Link>
          </section>
        </aside>
      </div>
    </>
  );
}

function Kpi({
  label,
  value,
  accent,
  muted,
}: {
  label: string;
  value: string;
  accent?: "primary";
  muted?: boolean;
}) {
  return (
    <div className={`card p-4 ${accent === "primary" ? "bg-accent text-accent-fg border-accent" : ""}`}>
      <div className={`text-xs uppercase tracking-wide ${accent ? "text-accent-fg/70" : "text-text-muted"}`}>
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${muted ? "text-text-muted" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function MiniKpi({
  label,
  value,
  positive,
  warn,
}: {
  label: string;
  value: string;
  positive?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="flex items-center justify-between bg-surface-2 rounded-md px-3 py-2 text-xs">
      <span className="text-text-muted">{label}</span>
      <span
        className={`tabular-nums font-medium ${
          positive ? "text-positive" : warn ? "text-warning" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function WidgetSkeleton({ title }: { title: string }) {
  return (
    <section className="card">
      <header className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold text-sm">{title}</h2>
        <span className="text-xs text-text-muted">wird geladen …</span>
      </header>
      <div className="px-5 py-8">
        <div className="h-3 w-2/3 bg-surface-2 rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-surface-2 rounded mt-2 animate-pulse" />
      </div>
    </section>
  );
}

type InvoiceLite = { date: Date; total: number; subtotal: number };

function buildChartData(invoices: InvoiceLite[], range: RangeKey) {
  if (invoices.length === 0) return [];
  const buckets = new Map<string, { label: string; total: number; net: number; sortKey: number }>();
  const addToBucket = (key: string, label: string, sortKey: number, inv: InvoiceLite) => {
    const cur = buckets.get(key) || { label, total: 0, net: 0, sortKey };
    cur.total += inv.total;
    cur.net += inv.subtotal;
    buckets.set(key, cur);
  };
  for (const inv of invoices) {
    const d = new Date(inv.date);
    if (range === "today") {
      const h = d.getHours();
      addToBucket(`h-${h}`, `${h}:00`, h, inv);
    } else if (range === "week") {
      const day = d.getDay();
      const labels = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
      addToBucket(`d-${day}`, labels[day], day === 0 ? 7 : day, inv);
    } else if (range === "month") {
      const day = d.getDate();
      addToBucket(`md-${day}`, `${day}.`, day, inv);
    } else if (range === "year") {
      const m = d.getMonth();
      const labels = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
      addToBucket(`mo-${m}`, labels[m], m, inv);
    } else {
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;
      const sortKey = d.getFullYear() * 12 + d.getMonth();
      addToBucket(ym, label, sortKey, inv);
    }
  }
  return Array.from(buckets.values())
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ label, total, net }) => ({ label, total, net }));
}
