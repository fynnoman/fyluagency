import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Plus, FileText, Upload } from "lucide-react";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import { formatMoney, formatDate } from "@/lib/format";
import { addIssue, addCost, updateCustomer, deleteCustomer } from "../actions";
import IssueRow from "./IssueRow";
import CostRow from "./CostRow";
import InvoiceUpload from "./InvoiceUpload";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function CustomerPage(props: { params: Params }) {
  const { id } = await props.params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      issues: { orderBy: [{ done: "asc" }, { createdAt: "desc" }] },
      costs: { orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { date: "desc" } },
      uploadedInvoices: { orderBy: { uploadedAt: "desc" } },
    },
  });

  if (!customer) notFound();

  const totalInvoiced = customer.invoices.reduce((s, i) => s + i.total, 0);
  const totalNet = customer.invoices.reduce((s, i) => s + i.subtotal, 0);
  const totalVat = customer.invoices.reduce((s, i) => s + i.vatAmount, 0);
  const openIssues = customer.issues.filter((i) => !i.done).length;
  const monthlyCost = customer.costs
    .filter((c) => c.frequency === "monthly")
    .reduce((s, c) => s + c.amount, 0);

  const updateAction = updateCustomer.bind(null, customer.id);
  const issueAction = addIssue.bind(null, customer.id);
  const costAction = addCost.bind(null, customer.id);
  const deleteAction = deleteCustomer.bind(null, customer.id);

  return (
    <>
      <Link
        href="/kunden"
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text mb-3"
      >
        <ChevronLeft size={14} /> Alle Kunden
      </Link>

      <PageHeader
        title={customer.name}
        subtitle={customer.company || customer.email || "Kunde"}
        actions={
          <Link
            href={`/rechnungen/neu?customerId=${customer.id}`}
            className="btn btn-primary"
          >
            <Plus size={14} /> Rechnung erstellen
          </Link>
        }
      />

      {/* KPI strip */}
      <div className="grid sm:grid-cols-4 gap-3 mb-8">
        <Kpi label="Umsatz brutto" value={formatMoney(totalInvoiced)} />
        <Kpi label="davon MwSt." value={formatMoney(totalVat)} muted />
        <Kpi label="Wiederkehrend / Monat" value={formatMoney(monthlyCost)} muted />
        <Kpi label="Offene Aufgaben" value={String(openIssues)} accent={openIssues > 0} />
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* Issues */}
          <section className="card">
            <header className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-sm">Aufgaben &amp; Wünsche</h2>
              <span className="text-xs text-text-muted">
                {openIssues} offen · {customer.issues.length - openIssues} fertig
              </span>
            </header>

            <div>
              {customer.issues.length === 0 ? (
                <div className="px-5 py-6 text-sm text-text-muted">
                  Keine Aufgaben für diesen Kunden — leg unten welche an.
                </div>
              ) : (
                customer.issues.map((i) => (
                  <IssueRow
                    key={i.id}
                    issue={{
                      id: i.id,
                      title: i.title,
                      description: i.description,
                      price: i.price,
                      done: i.done,
                    }}
                    customerId={customer.id}
                  />
                ))
              )}
            </div>

            <form action={issueAction} className="px-5 py-4 border-t border-border grid sm:grid-cols-[1fr_120px_auto] gap-2">
              <input
                className="input"
                name="title"
                placeholder="Neue Aufgabe / Wunsch"
                required
              />
              <input
                className="input"
                name="price"
                placeholder="€"
                inputMode="decimal"
              />
              <button type="submit" className="btn btn-secondary">
                <Plus size={14} /> Hinzufügen
              </button>
              <textarea
                className="textarea sm:col-span-3"
                name="description"
                placeholder="Beschreibung (optional)"
                rows={2}
              />
            </form>
          </section>

          {/* Costs */}
          <section className="card">
            <header className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-sm">Kosten</h2>
              <span className="text-xs text-text-muted">
                {customer.costs.length} Einträge
              </span>
            </header>

            <div>
              {customer.costs.length === 0 ? (
                <div className="px-5 py-6 text-sm text-text-muted">
                  Noch keine Kosten gebucht — Domain, Hosting, Lizenzen etc.
                </div>
              ) : (
                customer.costs.map((c) => (
                  <CostRow
                    key={c.id}
                    cost={{
                      id: c.id,
                      description: c.description,
                      amount: c.amount,
                      frequency: c.frequency,
                      dueDate: c.dueDate,
                    }}
                    customerId={customer.id}
                  />
                ))
              )}
            </div>

            <form action={costAction} className="px-5 py-4 border-t border-border grid sm:grid-cols-[1fr_120px_140px_140px_auto] gap-2">
              <input className="input" name="description" placeholder="z. B. Domain" required />
              <input className="input" name="amount" placeholder="€" inputMode="decimal" required />
              <select className="select" name="frequency" defaultValue="once">
                <option value="once">einmalig</option>
                <option value="monthly">monatlich</option>
                <option value="yearly">jährlich</option>
              </select>
              <input className="input" name="dueDate" type="date" />
              <button type="submit" className="btn btn-secondary">
                <Plus size={14} /> Speichern
              </button>
            </form>
          </section>

          {/* Invoices */}
          <section className="card">
            <header className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-sm">Eigene Rechnungen</h2>
              <Link
                href={`/rechnungen/neu?customerId=${customer.id}`}
                className="text-xs text-accent hover:underline"
              >
                + Neue Rechnung
              </Link>
            </header>
            {customer.invoices.length === 0 ? (
              <div className="px-5 py-6 text-sm text-text-muted">
                Keine Rechnungen für diesen Kunden.
              </div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Nr.</th>
                    <th>Datum</th>
                    <th>Status</th>
                    <th>Brutto</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {customer.invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="font-mono text-xs">{inv.number}</td>
                      <td>{formatDate(inv.date)}</td>
                      <td><InvoiceStatusPill status={inv.status} /></td>
                      <td className="tabular-nums">{formatMoney(inv.total)}</td>
                      <td>
                        <Link href={`/rechnungen/${inv.id}`} className="text-accent text-xs">
                          öffnen →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Uploaded invoices */}
          <section className="card">
            <header className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Upload size={14} /> Rechnungen hochladen
              </h2>
              <span className="text-xs text-text-muted">
                Auto-Erkennung von Brutto / MwSt.
              </span>
            </header>
            <div className="p-5">
              <InvoiceUpload customerId={customer.id} />
            </div>
            {customer.uploadedInvoices.length > 0 && (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Datei</th>
                    <th>Datum</th>
                    <th>Netto</th>
                    <th>MwSt.</th>
                    <th>Brutto</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.uploadedInvoices.map((u) => (
                    <tr key={u.id}>
                      <td className="font-mono text-xs">
                        <a
                          href={u.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-accent"
                        >
                          <FileText size={12} className="inline mr-1" />
                          {u.filename}
                        </a>
                      </td>
                      <td>{formatDate(u.extractedDate)}</td>
                      <td className="tabular-nums">{u.extractedNet != null ? formatMoney(u.extractedNet) : "—"}</td>
                      <td className="tabular-nums">{u.extractedVat != null ? formatMoney(u.extractedVat) : "—"}</td>
                      <td className="tabular-nums font-medium">{u.extractedTotal != null ? formatMoney(u.extractedTotal) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          <section className="card">
            <header className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-sm">Stammdaten</h2>
            </header>
            <form action={updateAction} className="p-5 space-y-4">
              <Field name="name" label="Name" defaultValue={customer.name} required />
              <Field name="company" label="Firma" defaultValue={customer.company || ""} />
              <Field name="email" label="E-Mail" type="email" defaultValue={customer.email || ""} />
              <Field name="phone" label="Telefon" defaultValue={customer.phone || ""} />
              <div>
                <label className="label" htmlFor="address">Adresse</label>
                <textarea className="textarea" name="address" id="address" rows={3} defaultValue={customer.address || ""} />
              </div>
              <Field name="taxId" label="USt-ID" defaultValue={customer.taxId || ""} />
              <div>
                <label className="label" htmlFor="notes">Interne Notizen</label>
                <textarea className="textarea" name="notes" id="notes" rows={5} defaultValue={customer.notes || ""} />
              </div>
              <div className="flex items-center justify-between pt-1">
                <button type="submit" className="btn btn-primary">
                  Speichern
                </button>
              </div>
            </form>
            <form
              action={deleteAction}
              className="px-5 pb-5"
            >
              <button
                type="submit"
                className="btn btn-danger"
                formNoValidate
                onClick={(e) => {
                  if (!confirm(`${customer.name} wirklich löschen? Alle Aufgaben, Kosten und Rechnungen werden ebenfalls gelöscht.`)) {
                    e.preventDefault();
                  }
                }}
              >
                Kunde löschen
              </button>
            </form>
          </section>

          <section className="card p-5 text-sm text-text-muted">
            <h3 className="font-semibold text-text mb-2">Bilanz</h3>
            <div className="flex justify-between py-1">
              <span>Netto-Umsatz</span>
              <span className="tabular-nums">{formatMoney(totalNet)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>MwSt.</span>
              <span className="tabular-nums">{formatMoney(totalVat)}</span>
            </div>
            <div className="flex justify-between py-1 border-t border-border mt-2 pt-2">
              <span className="text-text font-medium">Gesamt brutto</span>
              <span className="tabular-nums font-medium text-text">{formatMoney(totalInvoiced)}</span>
            </div>
          </section>
        </div>
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
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide text-text-muted">{label}</div>
      <div
        className={`mt-1 text-xl font-semibold tabular-nums ${
          accent ? "text-warning" : muted ? "text-text-muted" : "text-text"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  required,
  type = "text",
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
        {required && " *"}
      </label>
      <input
        className="input"
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
      />
    </div>
  );
}

function InvoiceStatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "pill",
    sent: "pill pill-info",
    paid: "pill pill-positive",
    overdue: "pill pill-negative",
  };
  const label: Record<string, string> = {
    draft: "Entwurf",
    sent: "verschickt",
    paid: "bezahlt",
    overdue: "überfällig",
  };
  return <span className={map[status] || "pill"}>{label[status] || status}</span>;
}
