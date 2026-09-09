import { chat, isAnyReachable } from "./ai";

export type ParsedItem = {
  description: string;
  quantity: number;
  unitPrice: number;
};

/**
 * Parse a free-text description of a customer engagement into structured
 * invoice line items. Tries Ollama first (better at messy German prose);
 * falls back to a regex/heuristic parser if Ollama is offline so the user
 * is never blocked.
 */
export async function parseInvoiceText(text: string): Promise<{
  items: ParsedItem[];
  source: "openai" | "ollama" | "heuristic";
}> {
  const trimmed = text.trim();
  if (!trimmed) return { items: [], source: "heuristic" };

  if (await isAnyReachable()) {
    try {
      const { items, source } = await aiParse(trimmed);
      if (items.length > 0) return { items, source };
    } catch {
      // Fall through to heuristic
    }
  }
  return { items: heuristicParse(trimmed), source: "heuristic" };
}

async function aiParse(
  text: string,
): Promise<{ items: ParsedItem[]; source: "openai" | "ollama" }> {
  const system = `Du bist ein präziser Parser für deutsche Rechnungs-Beschreibungen einer Webdesign-/Marketing-Agentur.
Du bekommst einen freien Text. Extrahiere die einzelnen Leistungspositionen als JSON-Array.

Regeln:
- Jede Position: { "description": string, "quantity": number, "unitPrice": number }
- description: Klarer Leistungstext, z. B. "SEO Optimierung" oder "Google Ads Budget".
- unitPrice ist immer NETTO in Euro (auch wenn der User Brutto-Preise geschrieben hat, gehe von Netto aus).
- quantity ist standardmäßig 1.
- Wenn der Nutzer mehrere Leistungen aufzählt, nutze für jede eine eigene Position.
- KEINE Mehrwertsteuer als eigene Zeile.
- Sortiere logisch (z. B. größere Posten zuerst).
- Antworte ausschließlich als JSON-Objekt mit Schlüssel "items".

Beispiel-Input:
"Kunde hat SEO, Website und Google Ads bekommen. SEO 200, Website 800, Google Ads Leistung 200, Google Ads Budget 250"

Beispiel-Output:
{"items":[
  {"description":"Webseiten-Entwicklung","quantity":1,"unitPrice":800},
  {"description":"Google Ads Leistung","quantity":1,"unitPrice":200},
  {"description":"Google Ads Budget","quantity":1,"unitPrice":250},
  {"description":"SEO Optimierung","quantity":1,"unitPrice":200}
]}`;

  const res = await chat(
    [
      { role: "system", content: system },
      { role: "user", content: text },
    ],
    { json: true, temperature: 0.1 },
  );
  const source: "openai" | "ollama" = res.source === "openai" ? "openai" : "ollama";

  const obj = safeJson(res.content);
  if (!obj || !Array.isArray(obj.items)) return { items: [], source };

  const items = obj.items
    .map((it): ParsedItem | null => {
      if (!it || typeof it !== "object") return null;
      const desc = String((it as { description?: unknown }).description || "").trim();
      const qty = Number((it as { quantity?: unknown }).quantity ?? 1);
      const price = Number((it as { unitPrice?: unknown }).unitPrice ?? 0);
      if (!desc || !Number.isFinite(price)) return null;
      return {
        description: desc,
        quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
        unitPrice: price,
      };
    })
    .filter((x): x is ParsedItem => x !== null);

  return { items, source };
}

/**
 * Heuristic fallback. Looks for "<label> <price>" patterns separated by
 * commas, "und", or newlines. Handles € symbol, "Euro", "EUR".
 */
function heuristicParse(text: string): ParsedItem[] {
  // Normalise separators
  const segments = text
    .replace(/\bund\b/gi, ",")
    .split(/[,\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const priceRe = /([0-9]+(?:[.,][0-9]{1,2})?)\s*(?:€|EUR|Euro)?/i;
  const items: ParsedItem[] = [];

  for (const seg of segments) {
    const match = seg.match(priceRe);
    if (!match) continue;
    const priceStr = match[1].replace(",", ".");
    const price = Number(priceStr);
    if (!Number.isFinite(price)) continue;

    // Strip price + currency from the segment for the description
    const description = seg
      .replace(priceRe, "")
      .replace(/(€|EUR|Euro|für|nehme ich|nehme|kostet)/gi, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^[:\-–—]+|[:\-–—]+$/g, "")
      .trim();

    if (!description) continue;

    items.push({
      description: description.charAt(0).toUpperCase() + description.slice(1),
      quantity: 1,
      unitPrice: price,
    });
  }

  return items;
}

function safeJson(raw: string): { items?: unknown } | null {
  try {
    return JSON.parse(raw);
  } catch {
    // Some local models wrap JSON in markdown fences — strip and retry
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}
