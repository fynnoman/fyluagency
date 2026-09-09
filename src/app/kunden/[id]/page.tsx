import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Plus, FileText, Upload, Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import { formatMoney, formatDate } from "@/lib/format";
import {
  addCost,
  addScopeItem,
  updateCustomer,
  deleteCustomer,
} from "../actions";
import CostRow from "./CostRow";
import InvoiceUpload from "./InvoiceUpload";
import ProcessCard from "./ProcessCard";
import ScopeItemRow from "./ScopeItemRow";
import DeleteCustomerButton from "./DeleteCustomerButton";

const PROCESS_STEPS_TOTAL = 7;

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function CustomerPage(props: { params: Params }) {
  const { id } = await props.params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      costs: { orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { date: "desc" } },
      uploadedInvoices: { orderBy: { uploadedAt: "desc" } },
      scopeItems: { orderBy: [{ done: "asc" }, { order: "asc" }] },
    },
  });

  if (!customer) notFound();

  const totalInvoiced = customer.invoices.reduce((s, i) => s + i.total, 0);
  const totalNet = customer.invoices.reduce((s, i) => s + i.subtotal, 0);
  const totalVat = customer.invoices.reduce((s, i) => s + i.vatAmount, 0);
  const monthlyCost = customer.costs
    .filter((c) => c.frequency === "monthly")
    .reduce((s, c) => s + c.amount, 0);

  const processValues = {
    processOfferAccepted: customer.processOfferAccepted,
    processScopeDefined: customer.processScopeDefined,
    processPreferencesCollected: customer.processPreferencesCollected,
    processDownPaymentPaid: customer.processDownPaymentPaid,
    processProjectCompleted: customer.processProjectCompleted,
    processFinalInvoicePaid: customer.processFinalInvoicePaid,
    processReferenceCollected: customer.processReferenceCollected,
  };
  const processDone = Object.values(processValues).filter(Boolean).length;
  const scopeTotal = customer.scopeItems.reduce(
    (s, it) => s + (it.unitPrice != null ? it.unitPrice * it.quantity : 0),
    0,
  );

  const updateAction = updateCustomer.bind(null, customer.id);
  const costAction = addCost.bind(null, customer.id);
  const scopeAction = addScopeItem.bind(null, customer.id);
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
          <>
            <a
              href={`/api/kunden/${customer.id}/export`}
              className="btn btn-secondary"
              download
            >
              <Download size={14} /> Alles exportieren
            </a>
            <Link
              href={`/rechnungen/neu?customerId=${customer.id}`}
              className="btn btn-primary"
            >
              <Plus size={14} /> Rechnung erstellen
            </Link>
          </>
        }
      />

      {/* KPI strip */}
      <div className="grid sm:grid-cols-4 gap-3 mb-8">
        <Kpi label="Umsatz brutto" value={formatMoney(totalInvoiced)} />
        <Kpi label="davon MwSt." value={formatMoney(totalVat)} muted />
        <Kpi label="Wiederkehrend / Monat" value={formatMoney(monthlyCost)} muted />
        <Kpi
          label="Prozess-Fortschritt"
          value={`${processDone}/${PROCESS_STEPS_TOTAL}`}
          accent={processDone === PROCESS_STEPS_TOTAL}
        />
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* Prozess-Checkliste */}
          <ProcessCard
            customerId={customer.id}
            values={processValues}
            scopeDocument={{
              filename: customer.scopeDocumentFilename,
              path: customer.scopeDocumentPath,
              uploadedAt: customer.scopeDocumentUploadedAt,
            }}
          />

          {/* Leistungsumfang */}
          <section className="card">
            <header className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-sm">Leistungsumfang</h2>
              <span className="text-xs text-text-muted">
                {customer.scopeItems.length === 0
                  ? "noch nichts hinterlegt"
                  : scopeTotal > 0
                    ? `${customer.scopeItems.length} Positionen · Summe ${formatMoney(scopeTotal)}`
                    : `${customer.scopeItems.length} Positionen`}
              </span>
            </header>

            <div>
              {customer.scopeItems.length === 0 ? (
                <div className="px-5 py-6 text-sm text-text-muted">
                  Lad in Schritt 2 ein Leistungsumfang-PDF hoch oder trag Positionen manuell unten ein.
                </div>
              ) : (
                customer.scopeItems.map((it) => (
                  <ScopeItemRow
                    key={it.id}
                    item={{
                      id: it.id,
                      title: it.title,
                      details: it.details,
                      quantity: it.quantity,
                      unitPrice: it.unitPrice,
                      done: it.done,
                    }}
                    customerId={customer.id}
                  />
                ))
              )}
            </div>

            <form
              action={scopeAction}
              className="px-5 py-4 border-t border-border grid sm:grid-cols-[1fr_80px_120px_auto] gap-2"
            >
              <input
                className="input"
                name="title"
                placeholder="Neue Position"
                required
              />
              <input
                className="input"
                name="quantity"
                placeholder="Menge"
                inputMode="decimal"
                defaultValue="1"
              />
              <input
                className="input"
                name="unitPrice"
                placeholder="€ / Einheit"
                inputMode="decimal"
              />
              <button type="submit" className="btn btn-secondary">
                <Plus size={14} /> Hinzufügen
              </button>
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
            <div className="px-5 pb-5">
              <DeleteCustomerButton
                customerName={customer.name}
                action={deleteAction}
              />
            </div>
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
