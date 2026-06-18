import { prisma } from "./prisma";
import { chat, isReachable } from "./ollama";

export type UpsellSuggestion = {
  customerId: string;
  customerName: string;
  headline: string; // 1-line pitch
  reason: string; // 1–2 sentences why this customer
  amount: number; // suggested € value
};

/**
 * Build upsell suggestions across customers. For each customer with
 * activity we summarise their historic services, last invoice, and open
 * issues, then ask Ollama (if reachable) to recommend the next best
 * upsell. If Ollama is offline we synthesise a deterministic suggestion
 * from invoice patterns.
 */
export async function generateUpsells(): Promise<UpsellSuggestion[]> {
  const customers = await prisma.customer.findMany({
    where: { archivedAt: null },
    include: {
      invoices: {
        orderBy: { date: "desc" },
        include: { items: true },
        take: 6,
      },
      issues: true,
    },
    take: 30,
  });

  // Only customers with at least one invoice (paying customers)
  const candidates = customers.filter((c) => c.invoices.length > 0);
  if (!candidates.length) return [];

  const reachable = await isReachable();

  const results: UpsellSuggestion[] = [];

  for (const c of candidates.slice(0, 8)) {
    // Build summary
    const services = new Set<string>();
    let revenue = 0;
    for (const inv of c.invoices) {
      revenue += inv.total;
      for (const it of inv.items) services.add(normaliseService(it.description));
    }
    const lastDate = c.invoices[0]?.date;
    const daysSinceLast = lastDate
      ? Math.round((Date.now() - new Date(lastDate).getTime()) / 86_400_000)
      : 999;

    if (reachable) {
      try {
        const ai = await aiSuggest({
          customerName: c.name,
          services: Array.from(services),
          revenue,
          daysSinceLast,
          openIssues: c.issues.filter((i) => !i.done).length,
        });
        if (ai) {
          results.push({
            customerId: c.id,
            customerName: c.name,
            ...ai,
          });
          continue;
        }
      } catch {
        // fall through to heuristic
      }
    }

    const heur = heuristicSuggest({
      services: Array.from(services),
      revenue,
      daysSinceLast,
    });
    if (heur) {
      results.push({
        customerId: c.id,
        customerName: c.name,
        ...heur,
      });
    }
  }

  // Sort by suggested amount descending
  return results.sort((a, b) => b.amount - a.amount).slice(0, 5);
}

async function aiSuggest(input: {
  customerName: string;
  services: string[];
  revenue: number;
  daysSinceLast: number;
  openIssues: number;
}): Promise<{ headline: string; reason: string; amount: number } | null> {
  const system = `Du bist Vertriebs-Coach für eine kleine Webdesign- und Marketing-Agentur in Deutschland.
Du bekommst Daten zu einem bestehenden Kunden. Schlag den NÄCHSTEN sinnvollen Upsell vor — konkret und auf Deutsch.

Antworte als JSON:
{
  "headline": "<1 Satz: konkretes Angebot>",
  "reason": "<1-2 Sätze: warum dieser Kunde das jetzt braucht>",
  "amount": <realistischer monatlicher oder einmaliger € Wert als Zahl>
}

Typische Upsells:
- Website-Pflege/Wartungspaket (50–150 €/Monat)
- Conversion-Optimierung (300–900 € einmalig)
- SEO-Erweiterung (200–500 €/Monat)
- Google Ads (150–400 € Leistung + Budget vorab)
- Content-Bundle (Blog, Texte, Bilder)
- Hosting/Domain-Bundle (15–40 €/Monat)
- Performance-Audit (250–600 €)

Wichtig: nur JSON, kein Markdown, kein Text drumherum.`;

  const userMsg = `Kunde: ${input.customerName}
Bisherige Leistungen: ${input.services.join(", ") || "—"}
Gesamtumsatz bisher: ${input.revenue.toFixed(0)} €
Tage seit letzter Rechnung: ${input.daysSinceLast}
Offene Aufgaben: ${input.openIssues}`;

  const raw = await chat(
    [
      { role: "system", content: system },
      { role: "user", content: userMsg },
    ],
    { json: true, temperature: 0.5 }
  );
  const obj = safeJson(raw);
  if (!obj) return null;
  const headline = String(obj.headline || "").trim();
  const reason = String(obj.reason || "").trim();
  const amount = Number(obj.amount);
  if (!headline || !Number.isFinite(amount)) return null;
  return { headline, reason, amount: Math.round(amount) };
}

function heuristicSuggest(input: {
  services: string[];
  revenue: number;
  daysSinceLast: number;
}): { headline: string; reason: string; amount: number } | null {
  const has = (label: string) =>
    input.services.some((s) => s.toLowerCase().includes(label));

  if (!has("seo")) {
    return {
      headline: "SEO-Paket anbieten — monatlich 200 €",
      reason: "Kunde hat noch kein SEO. Klassischer Folge-Upsell nach Website-Launch.",
      amount: 200,
    };
  }
  if (!has("ads") && !has("google")) {
    return {
      headline: "Google Ads Setup + 200 € monatliche Betreuung",
      reason: "Kunde hat SEO aber keine bezahlte Reichweite. Quick-Win für mehr Leads.",
      amount: 200,
    };
  }
  if (input.daysSinceLast > 60) {
    return {
      headline: "Performance-Audit für 350 € anbieten",
      reason: `Letzte Rechnung vor ${input.daysSinceLast} Tagen — guter Aufhänger für Check-in.`,
      amount: 350,
    };
  }
  if (!has("wartung") && !has("pflege")) {
    return {
      headline: "Wartungspaket für 99 €/Monat",
      reason: "Wiederkehrender Umsatz statt nur Projekt-Buchungen.",
      amount: 99,
    };
  }
  return null;
}

function normaliseService(desc: string): string {
  const lower = desc.toLowerCase();
  if (lower.includes("seo")) return "SEO";
  if (lower.includes("google ads") || lower.includes("ads")) return "Google Ads";
  if (lower.includes("website") || lower.includes("web")) return "Website";
  if (lower.includes("wartung") || lower.includes("pflege")) return "Wartung";
  if (lower.includes("hosting") || lower.includes("domain")) return "Hosting";
  if (lower.includes("content") || lower.includes("text")) return "Content";
  return desc.split(/[\s,]/)[0] || desc;
}

function safeJson(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}
