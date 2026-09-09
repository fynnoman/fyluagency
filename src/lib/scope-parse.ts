import { chat, isAnyReachable } from "./ai";

export type ParsedScopeItem = {
  title: string;
  details: string | null;
  quantity: number;
  unitPrice: number | null;
};

const SYSTEM_PROMPT = `Du bist ein präziser Parser für deutsche Leistungsverzeichnisse,
Angebote und Auftragsbestätigungen. Extrahiere jede einzelne Leistung als eigene
Position.

Regeln:
- title: kurze klare Bezeichnung der Leistung.
- details: optionale längere Beschreibung, wenn vorhanden (sonst null).
- quantity: Standard 1, sonst die genannte Menge.
- unitPrice: NETTO in Euro als Zahl, wenn eindeutig erkennbar (sonst null).
- Wenn nur ein Gesamtpreis für eine Position steht, gib diesen als unitPrice
  zurück und quantity=1.
- Übernimm nur echte Leistungen; überspringe Zwischensummen, MwSt-Zeilen,
  Gesamtsumme, Zahlungsbedingungen, Adressblöcke.
- Reihenfolge wie im Dokument.

Antworte ausschließlich mit einem JSON-Objekt der Form:
{"items":[{"title":"...","details":null,"quantity":1,"unitPrice":null}, ...]}`;

/**
 * Nimmt Freitext aus dem Leistungsumfang-PDF und liefert strukturierte
 * Positionen zurück. Wenn Ollama erreichbar ist, wird das Modell befragt.
 * Sonst wird eine simple Zeilen-Heuristik verwendet.
 */
export async function parseScopeText(text: string): Promise<{
  items: ParsedScopeItem[];
  source: "openai" | "ollama" | "heuristic";
}> {
  const trimmed = text.trim();
  if (!trimmed) return { items: [], source: "heuristic" };

  if (await isAnyReachable()) {
    try {
      const { items, source } = await aiParse(trimmed);
      if (items.length > 0) return { items, source };
    } catch {
      // fallthrough
    }
  }

  return { items: heuristicParse(trimmed), source: "heuristic" };
}

async function aiParse(
  text: string,
): Promise<{ items: ParsedScopeItem[]; source: "openai" | "ollama" }> {
  const res = await chat(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text.slice(0, 12_000) },
    ],
    { json: true, temperature: 0.1 },
  );
  const parsed = safeJson(res.content);
  if (!parsed || !Array.isArray(parsed.items)) {
    return { items: [], source: res.source === "openai" ? "openai" : "ollama" };
  }
  const items: ParsedScopeItem[] = [];
  for (const rawIt of parsed.items) {
    if (!rawIt || typeof rawIt !== "object") continue;
    const it = rawIt as Record<string, unknown>;
    if (typeof it.title !== "string") continue;
    const title = it.title.trim();
    if (!title) continue;
    const quantity =
      typeof it.quantity === "number" && Number.isFinite(it.quantity) && it.quantity > 0
        ? it.quantity
        : 1;
    const unitPrice =
      typeof it.unitPrice === "number" && Number.isFinite(it.unitPrice)
        ? it.unitPrice
        : null;
    const details =
      typeof it.details === "string" && it.details.trim() !== ""
        ? it.details.trim()
        : null;
    items.push({ title, details, quantity, unitPrice });
  }
  return { items, source: res.source === "openai" ? "openai" : "ollama" };
}

function safeJson(s: string): { items?: unknown[] } | null {
  try {
    return JSON.parse(s);
  } catch {
    // Sometimes Ollama wraps the JSON in prose. Extract the outermost object.
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(s.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Fällt zurück auf einzelne Zeilen. Preise am Zeilenende (z. B. "1.200,00 €")
 * werden extrahiert. Kein Auto-Grouping, aber gut genug, damit der User was
 * zum Bearbeiten hat wenn Ollama offline ist.
 */
function heuristicParse(text: string): ParsedScopeItem[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 2);

  const priceRegex = /(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{2}))?\s*€?$/;
  const skipRegex = /^(zwischensumme|summe|gesamt|mwst|ust|netto|brutto|umsatzsteuer|rechnungsnummer|kunde|projekt|datum|zahlungsbedingung)/i;

  const items: ParsedScopeItem[] = [];
  for (const line of lines) {
    if (skipRegex.test(line)) continue;
    const m = line.match(priceRegex);
    let title = line;
    let unitPrice: number | null = null;
    if (m) {
      const intPart = m[1].replace(/\./g, "");
      const cents = m[2] || "0";
      unitPrice = Number(`${intPart}.${cents}`);
      title = line.slice(0, m.index).replace(/[·:\-–—]\s*$/, "").trim();
      if (!title) continue;
    }
    if (title.length < 3) continue;
    items.push({ title, details: null, quantity: 1, unitPrice });
    if (items.length >= 40) break;
  }
  return items;
}
