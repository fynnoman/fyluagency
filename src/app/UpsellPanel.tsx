import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { generateUpsells } from "@/lib/upsell";
import { formatMoney } from "@/lib/format";

export default async function UpsellPanel() {
  let suggestions: Awaited<ReturnType<typeof generateUpsells>> = [];
  try {
    suggestions = await generateUpsells();
  } catch {
    suggestions = [];
  }

  return (
    <section className="card">
      <header className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Sparkles size={14} className="text-accent" /> Wo holst du noch Geld raus?
        </h2>
        <span className="text-xs text-text-muted">KI-Vorschläge</span>
      </header>

      {suggestions.length === 0 ? (
        <div className="px-5 py-8 text-sm text-text-muted text-center">
          Sobald du Kunden mit ersten Rechnungen hast, schlagen wir hier passende
          Upsells vor.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {suggestions.map((s) => (
            <li key={s.customerId} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-text-muted uppercase tracking-wide">
                    <Link
                      href={`/kunden/${s.customerId}`}
                      className="hover:text-accent"
                    >
                      {s.customerName}
                    </Link>
                  </div>
                  <div className="font-medium text-sm mt-0.5">{s.headline}</div>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    {s.reason}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold text-accent tabular-nums">
                    +{formatMoney(s.amount)}
                  </div>
                  <Link
                    href={`/kunden/${s.customerId}`}
                    className="inline-flex items-center gap-0.5 text-xs text-accent hover:underline mt-1"
                  >
                    Ansprechen <ArrowRight size={10} />
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
