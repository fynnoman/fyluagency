import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { createCustomer } from "../actions";
import { ChevronLeft } from "lucide-react";

export default function NewCustomerPage() {
  return (
    <>
      <Link
        href="/kunden"
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text mb-3"
      >
        <ChevronLeft size={14} /> Zurück
      </Link>
      <PageHeader
        title="Neuer Kunde"
        subtitle="Stammdaten anlegen. Prozess, Leistungsumfang, Kosten und Rechnungen folgen danach."
      />

      <form action={createCustomer} className="card p-6 md:p-8 space-y-5 max-w-2xl">
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
          <div className="md:col-span-2">
            <label className="label" htmlFor="address">Adresse</label>
            <textarea className="textarea" id="address" name="address" rows={3} />
          </div>
          <div>
            <label className="label" htmlFor="taxId">USt-ID</label>
            <input className="input" id="taxId" name="taxId" />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="notes">Interne Notizen</label>
          <textarea className="textarea" id="notes" name="notes" rows={4} />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button type="submit" className="btn btn-primary">
            Kunde anlegen
          </button>
          <Link href="/kunden" className="btn btn-secondary">
            Abbrechen
          </Link>
        </div>
      </form>
    </>
  );
}
