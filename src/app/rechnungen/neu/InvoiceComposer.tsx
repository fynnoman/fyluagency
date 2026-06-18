"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Trash2 } from "lucide-react";
import { parseFromText, createInvoice } from "../actions";
import { formatMoney } from "@/lib/format";

type Item = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export default function InvoiceComposer({
  customers,
  preselectedCustomerId,
  defaultVatRate,
}: {
  customers: { id: string; name: string; company: string | null }[];
  preselectedCustomerId?: string;
  defaultVatRate: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [parseSpinner, setParseSpinner] = useState(false);

  const [customerId, setCustomerId] = useState(
    preselectedCustomerId || customers[0]?.id || ""
  );
  const [text, setText] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [vatRate, setVatRate] = useState(defaultVatRate);
  const [notes, setNotes] = useState("");
  const [source, setSource] = useState<"ollama" | "heuristic" | null>(null);

  const subtotal = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const vatAmount = (subtotal * vatRate) / 100;
  const total = subtotal + vatAmount;

  async function handleParse() {
    if (!text.trim()) {
      toast.error("Erst eine Beschreibung eintippen.");
      return;
    }
    setParseSpinner(true);
    try {
      const res = await parseFromText(text);
      if (!res.items.length) {
        toast.error("Konnte keine Posten extrahieren. Du kannst sie unten manuell hinzufügen.");
      } else {
        setItems(res.items);
        setSource(res.source);
        toast.success(
          res.source === "ollama"
            ? `Ollama hat ${res.items.length} Posten erkannt.`
            : `${res.items.length} Posten heuristisch erkannt (Ollama offline).`
        );
      }
    } catch (e) {
      toast.error(String(e instanceof Error ? e.message : e));
    } finally {
      setParseSpinner(false);
    }
  }

  async function handleCreate() {
    if (!customerId) {
      toast.error("Kunde wählen.");
      return;
    }
    if (!items.length) {
      toast.error("Keine Posten.");
      return;
    }
    start(async () => {
      try {
        const id = await createInvoice({
          customerId,
          items,
          date,
          vatRate,
          notes: notes || undefined,
        });
        toast.success("Rechnung erstellt.");
        router.push(`/rechnungen/${id}`);
      } catch (e) {
        toast.error(String(e instanceof Error ? e.message : e));
      }
    });
  }

  return (
    <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
      {/* Left: parser + items */}
      <div className="space-y-6">
        <section className="card p-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-accent" />
            <h2 className="font-semibold text-sm">
              Beschreib die Leistungen — KI macht Posten draus
            </h2>
          </div>
          <p className="text-xs text-text-muted mb-3">
            {`Beispiel: „Kunde hat SEO, Website und Google Ads bekommen. SEO 200, Website 800,
            Google Ads Leistung 200, Google Ads Budget 250"`}
          </p>
          <textarea
            className="textarea"
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Frei schreiben — die KI baut daraus die Rechnungs-Posten."
          />
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={handleParse}
              disabled={parseSpinner}
              className="btn btn-primary"
            >
              <Sparkles size={14} />
              {parseSpinner ? "Lese…" : "In Posten umwandeln"}
            </button>
            {source && (
              <span className="text-xs text-text-muted">
                Quelle:{" "}
                <strong>
                  {source === "ollama" ? "Ollama (lokale KI)" : "Heuristik (Fallback)"}
                </strong>
              </span>
            )}
          </div>
        </section>

        <section className="card">
          <header className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-sm">Posten</h2>
            <button
              type="button"
              className="text-xs text-accent hover:underline"
              onClick={() =>
                setItems((prev) => [
                  ...prev,
                  { description: "", quantity: 1, unitPrice: 0 },
                ])
              }
            >
              + Posten hinzufügen
            </button>
          </header>

          {items.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-text-muted">
              {`Noch keine Posten. Schreib oben rein und lass die KI parsen — oder
              klick „Posten hinzufügen".`}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[1fr_80px_120px_120px_auto] gap-2 px-5 py-3 items-center"
                >
                  <input
                    className="input"
                    value={it.description}
                    placeholder="Beschreibung"
                    onChange={(e) =>
                      setItems((prev) => {
                        const copy = [...prev];
                        copy[idx] = { ...copy[idx], description: e.target.value };
                        return copy;
                      })
                    }
                  />
                  <input
                    className="input text-right"
                    inputMode="decimal"
                    value={it.quantity}
                    onChange={(e) =>
                      setItems((prev) => {
                        const copy = [...prev];
                        copy[idx] = {
                          ...copy[idx],
                          quantity: Number(e.target.value.replace(",", ".")) || 0,
                        };
                        return copy;
                      })
                    }
                  />
                  <input
                    className="input text-right"
                    inputMode="decimal"
                    value={it.unitPrice}
                    onChange={(e) =>
                      setItems((prev) => {
                        const copy = [...prev];
                        copy[idx] = {
                          ...copy[idx],
                          unitPrice: Number(e.target.value.replace(",", ".")) || 0,
                        };
                        return copy;
                      })
                    }
                  />
                  <div className="text-right tabular-nums text-sm">
                    {formatMoney(it.quantity * it.unitPrice)}
                  </div>
                  <button
                    type="button"
                    className="text-text-dim hover:text-negative"
                    onClick={() =>
                      setItems((prev) => prev.filter((_, i) => i !== idx))
                    }
                    aria-label="Posten entfernen"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <footer className="px-5 py-4 border-t border-border space-y-1 text-sm">
            <Row label="Netto" value={formatMoney(subtotal)} />
            <Row label={`MwSt. (${vatRate}%)`} value={formatMoney(vatAmount)} muted />
            <Row label="Brutto" value={formatMoney(total)} strong />
          </footer>
        </section>
      </div>

      {/* Right: meta + submit */}
      <aside className="space-y-6">
        <section className="card p-5 space-y-4">
          <div>
            <label className="label">Kunde</label>
            <select
              className="select"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="" disabled>
                Kunde wählen…
              </option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.company ? ` · ${c.company}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Datum</label>
              <input
                className="input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="label">MwSt. %</label>
              <input
                className="input text-right"
                inputMode="decimal"
                value={vatRate}
                onChange={(e) =>
                  setVatRate(Number(e.target.value.replace(",", ".")) || 0)
                }
              />
            </div>
          </div>
          <div>
            <label className="label">Notiz (auf Rechnung)</label>
            <textarea
              className="textarea"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="z. B. Zahlungsziel-Hinweis, Projekt-Referenz"
            />
          </div>
        </section>

        <button
          type="button"
          className="btn btn-primary w-full"
          disabled={pending || !customerId || items.length === 0}
          onClick={handleCreate}
        >
          {pending ? "Erstelle…" : "Rechnung speichern"}
        </button>

        <p className="text-xs text-text-muted">
          Die Rechnung lässt sich anschließend als PDF exportieren, drucken, oder
          per Mail an den Kunden geben. Logo &amp; Layout kommen aus den Einstellungen.
        </p>
      </aside>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  strong,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between ${
        strong
          ? "border-t border-border pt-2 mt-1 font-semibold text-base"
          : muted
            ? "text-text-muted"
            : ""
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
