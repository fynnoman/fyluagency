import { getSettings } from "./settings";

export type OpenAIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/**
 * Single Chat-Completion round-trip against OpenAI. Returns the model's
 * text content. Throws on transport / API errors so the caller can
 * fall back to Ollama or heuristics.
 */
export async function chat(
  messages: OpenAIMessage[],
  opts?: {
    json?: boolean;
    model?: string;
    temperature?: number;
    apiKey?: string;
  },
): Promise<string> {
  const settings = await getSettings();
  const apiKey = opts?.apiKey || settings.openAIApiKey || "";
  if (!apiKey) throw new Error("Kein OpenAI-Key hinterlegt.");
  const model = opts?.model || settings.openAIModel || "gpt-4o-mini";

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: opts?.temperature ?? 0.2,
  };
  if (opts?.json) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${txt || res.statusText}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  if (data.error) throw new Error(`OpenAI: ${data.error.message || "Fehler"}`);
  return data.choices?.[0]?.message?.content ?? "";
}

/** Prüft ob ein Key hinterlegt und die API erreichbar ist. */
export async function isConfigured(): Promise<boolean> {
  const settings = await getSettings();
  return !!(settings.openAIApiKey && settings.openAIApiKey.trim());
}

/** Live-Test mit einer Mini-Anfrage. Für den Ping-Button in den Einstellungen. */
export async function ping(apiKey?: string, model?: string): Promise<boolean> {
  try {
    const out = await chat(
      [{ role: "user", content: "Antworte mit dem Wort ok." }],
      { apiKey, model, temperature: 0 },
    );
    return out.toLowerCase().includes("ok");
  } catch {
    return false;
  }
}
