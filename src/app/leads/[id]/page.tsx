import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ArrowRightCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import { formatDate, formatMoney } from "@/lib/format";
import { updateLead, deleteLead, convertLeadToCustomer } from "../actions";
import StatusButtons from "./StatusButtons";
import DeleteLeadButton from "./DeleteLeadButton";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function LeadPage(props: { params: Params }) {
  const { id } = await props.params;
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) notFound();

  const updateAction = updateLead.bind(null, id);
  const deleteAction = deleteLead.bind(null, id);
  const convertAction = convertLeadToCustomer.bind(null, id);

  return (
    <>
      <Link
        href="/leads"
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text mb-3"
      >
        <ChevronLeft size={14} /> Alle Leads
      </Link>

      <PageHeader
        title={lead.name}
        subtitle={lead.company || lead.source || "Lead"}
        actions={
          <form action={convertAction}>
            <button type="submit" className="btn btn-primary">
              <ArrowRightCircle size={14} /> Zum Kunden konvertieren
            </button>
          </form>
        }
      />

      <div className="card p-5 mb-6">
        <div className="text-xs uppercase tracking-wide text-text-muted mb-2">
          Status
        </div>
        <StatusButtons leadId={lead.id} current={lead.status} />
        <div className="mt-3 text-xs text-text-muted">
          Letzter Kontakt: {formatDate(lead.lastContactAt || lead.createdAt)}
        </div>
      </div>

      <form action={updateAction} className="card p-6 md:p-8 space-y-5 max-w-3xl">
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className="label">Name *</label>
            <input className="input" name="name" defaultValue={lead.name} required />
          </div>
          <div>
            <label className="label">Firma</label>
            <input className="input" name="company" defaultValue={lead.company || ""} />
          </div>
          <div>
            <label className="label">E-Mail</label>
            <input className="input" name="email" type="email" defaultValue={lead.email || ""} />
          </div>
          <div>
            <label className="label">Telefon</label>
            <input className="input" name="phone" defaultValue={lead.phone || ""} />
          </div>
          <div>
            <label className="label">Quelle</label>
            <input className="input" name="source" defaultValue={lead.source || ""} />
          </div>
          <div>
            <label className="label">
              Geschätzter Wert (€){" "}
              <span className="text-text-dim font-normal">
                {lead.expectedValue != null && `· aktuell ${formatMoney(lead.expectedValue)}`}
              </span>
            </label>
            <input
              className="input"
              name="expectedValue"
              defaultValue={lead.expectedValue ?? ""}
              inputMode="decimal"
            />
          </div>
        </div>

        <div>
          <label className="label">Notizen</label>
          <textarea
            className="textarea"
            name="notes"
            rows={8}
            defaultValue={lead.notes || ""}
            placeholder="Gesprächsverlauf, Schmerzpunkte, nächste Schritte…"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <button type="submit" className="btn btn-primary">
            Speichern
          </button>
        </div>
      </form>

      <div className="mt-6">
        <DeleteLeadButton action={deleteAction} />
      </div>
    </>
  );
}
