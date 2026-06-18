import { chat, isReachable } from "./ollama";

export type ExtractedInvoice = {
  total: number | null;
  net: number | null;
  vat: number | null;
  date: Date | null;
  source: "ollama" | "heuristic";
};

/** Pull text from a PDF buffer using pdf-parse, lazy-imported. */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  // pdf-parse has a top-level test that breaks in some bundlers — lazy load.
  const mod = await import("pdf-parse");
  const pdfParse = (mod as { default?: unknown }).default ?? mod;
  type PdfParseFn = (b: Buffer) => Promise<{ text: string }>;
  const data = await (pdfParse as PdfParseFn)(buffer);
  return data.text || "";
}

/**
 * Look at a chunk of invoice text and pull out the totals. Tries Ollama first,
 * falls back to a heuristic that covers the German invoice conventions.
 */
export async function extractTotalsFromText(text: string): Promise<ExtractedInvoice> {
  const reachable = await isReachable();
  if (reachable) {
    try {
      const ai = await ollamaExtract(text);
      if (ai) return { ...ai, source: "ollama" };
    } catch {
      // fall through
    }
  }
  return { ...heuristicExtract(text), source: "heuristic" };
}

async function ollamaExtract(text: string): Promise<Omit<ExtractedInvoice, "source"> | null> {
  const system = `Du bist ein Parser für deutsche Rechnungs-PDFs einer Webdesign-Agentur.
Du bekommst rohen Rechnungstext (oft chaotisch). Gib ein JSON-Objekt zurück:

{
  "total": <Brutto-Endbetrag in € als Zahl>,
  "net": <Netto-Summe in € als Zahl>,
  "vat": <Mehrwertsteuer-Betrag in € als Zahl>,
  "date": <Rechnungsdatum als ISO yyyy-mm-dd>
}

Regeln:
- Verwende immer Punkt statt Komma als Dezimaltrennzeichen
- Wenn ein Wert nicht eindeutig erkennbar ist: null
- Bevorzuge "Gesamtbetrag", "Endbetrag", "Brutto", "Total"
- VAT/MwSt./USt. = vat
- Wenn nur Brutto und VAT erkennbar sind, berechne net = total - vat
- date: das Datum der Rechnungsstellung, nicht das Fälligkeitsdatum
- Antworte ausschließlich mit JSON, kein Text drumherum`;

  const raw = await chat(
    [
      { role: "system", content: system },
      { role: "user", content: text.slice(0, 4000) },
    ],
    { json: true, temperature: 0.1 }
  );

  const obj = safeJson(raw);
  if (!obj) return null;
  const total = toNum(obj.total);
  const net = toNum(obj.net);
  const vat = toNum(obj.vat);
  const date = toDate(obj.date);

  // Sanity: total must be plausible
  if (total == null && net == null) return null;

  return {
    total,
    net: net ?? (total != null && vat != null ? round2(total - vat) : null),
    vat,
    date,
  };
}

function heuristicExtract(text: string): Omit<ExtractedInvoice, "source"> {
  const normalized = text.replace(/ /g, " ");
  const numberRe = /([0-9]{1,3}(?:[.  ][0-9]{3})*(?:[,.][0-9]{2})|[0-9]+[,.][0-9]{2})/;

  // Brutto / Gesamtbetrag / Endbetrag
  const grossLine = matchLine(normalized, [
    /gesamt(betrag)?/i,
    /brutto(betrag)?/i,
    /endbetrag/i,
    /rechnungsbetrag/i,
    /summe (zahlung|zu zahlen)/i,
    /\btotal\b/i,
  ]);
  const vatLine = matchLine(normalized, [/mwst\.?/i, /ust\.?/i, /umsatzsteuer/i, /\bvat\b/i]);
  const netLine = matchLine(normalized, [/nettosumme/i, /zwischensumme/i, /^netto/i, /summe netto/i]);

  const grossMatch = grossLine?.match(numberRe);
  const vatMatch = vatLine?.match(numberRe);
  const netMatch = netLine?.match(numberRe);

  const total = grossMatch ? parseDeAmount(grossMatch[0]) : null;
  const vat = vatMatch ? parseDeAmount(vatMatch[0]) : null;
  let net = netMatch ? parseDeAmount(netMatch[0]) : null;
  if (net == null && total != null && vat != null) net = round2(total - vat);

  const dateMatch = normalized.match(
    /(0?[1-9]|[12][0-9]|3[01])[.\-\/](0?[1-9]|1[0-2])[.\-\/](20[0-9]{2})/
  );
  const date = dateMatch
    ? new Date(`${dateMatch[3]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[1].padStart(2, "0")}`)
    : null;

  return { total, net, vat, date: Number.isNaN(date?.getTime()) ? null : date };
}

function matchLine(text: string, patterns: RegExp[]): string | null {
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    for (const re of patterns) {
      if (re.test(line)) return line;
    }
  }
  return null;
}

function parseDeAmount(raw: string): number {
  // German format may be "1.234,56" or "1234,56" or "1234.56"
  const stripped = raw.replace(/[^\d,.\-]/g, "");
  const hasComma = stripped.includes(",");
  const hasDot = stripped.includes(".");
  let normalized = stripped;
  if (hasComma && hasDot) {
    // Treat last separator as decimal
    const lastComma = stripped.lastIndexOf(",");
    const lastDot = stripped.lastIndexOf(".");
    const decSep = lastComma > lastDot ? "," : ".";
    const thousandsSep = decSep === "," ? "." : ",";
    normalized = stripped
      .split(thousandsSep)
      .join("")
      .replace(decSep, ".");
  } else if (hasComma) {
    normalized = stripped.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = stripped.replace(/,/g, "");
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? round2(n) : null;
}
function toDate(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
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
