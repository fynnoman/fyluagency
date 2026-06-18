import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { createLead } from "../actions";

export default function NewLeadPage() {
  return (
    <>
      <Link
        href="/leads"
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text mb-3"
      >
        <ChevronLeft size={14} /> Zurück
      </Link>
      <PageHeader
        title="Neuer Lead"
        subtitle="Potenzieller Kunde — wandere durch die Pipeline und konvertiere bei Abschluss."
      />

      <form action={createLead} className="card p-6 md:p-8 space-y-5 max-w-2xl">
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className="label" htmlFor="name">Name *</label>
            <input className="input" id="name" name="name" required autoFocus />
          </div>
          <div>
            <label className="label" htmlFor="company">Firma</label>
            <input className="input" id="company" name="company" />
          </div>
          <div>
            <label className="label" htmlFor="email">E-Mail</label>
            <input className="input" id="email" name="email" type="email" />
          </div>
          <div>
            <label className="label" htmlFor="phone">Telefon</label>
            <input className="input" id="phone" name="phone" />
          </div>
          <div>
            <label className="label" htmlFor="source">Quelle</label>
            <input
              className="input"
              id="source"
              name="source"
              placeholder="z. B. Instagram, Empfehlung, Cold Call"
            />
          </div>
          <div>
            <label className="label" htmlFor="expectedValue">
              Geschätzter Wert (€)
            </label>
            <input
              className="input"
              id="expectedValue"
              name="expectedValue"
              inputMode="decimal"
              placeholder="z. B. 1200"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="notes">Notizen</label>
          <textarea
            className="textarea"
            id="notes"
            name="notes"
            rows={6}
            placeholder="Was hat er gesagt, was sind die Schmerzpunkte, wie reagiert er?"
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button type="submit" className="btn btn-primary">
            Lead anlegen
          </button>
          <Link href="/leads" className="btn btn-secondary">
            Abbrechen
          </Link>
        </div>
      </form>
    </>
  );
}
