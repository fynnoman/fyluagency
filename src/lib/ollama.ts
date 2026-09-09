import { getSettings } from "./settings";

export type OllamaMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/**
 * Single chat round-trip against a local Ollama HTTP API. Returns the model's
 * response content as a string. Throws on transport errors so the caller can
 * decide whether to fall back to a heuristic parser.
 */
export async function chat(messages: OllamaMessage[], opts?: {
  json?: boolean;
  model?: string;
  temperature?: number;
}) {
  const settings = await getSettings();
  const baseUrl = settings.ollamaBaseUrl || "http://localhost:11434";
  const model = opts?.model || settings.ollamaModel || "llama3.2";

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      format: opts?.json ? "json" : undefined,
      messages,
      options: {
        temperature: opts?.temperature ?? 0.2,
      },
    }),
    // Local network — short timeout via AbortController
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Ollama ${res.status}: ${txt || res.statusText}`);
  }

  const data = (await res.json()) as {
    message?: { content?: string };
    error?: string;
  };
  if (data.error) throw new Error(`Ollama: ${data.error}`);
  return data.message?.content ?? "";
}

/** Quick reachability check used by Settings and AI-feature gates. */
export async function isReachable(baseUrl?: string): Promise<boolean> {
  // Ollama is a local-only fallback. On Vercel/production there is no
  // localhost:11434, and a blocking fetch (even short) taxes every page
  // render that touches this. Short-circuit in production.
  if (process.env.VERCEL || process.env.NODE_ENV === "production") return false;
  const settings = await getSettings();
  const url = baseUrl || settings.ollamaBaseUrl || "http://localhost:11434";
  try {
    const res = await fetch(`${url}/api/tags`, {
      signal: AbortSignal.timeout(800),
    });
    return res.ok;
  } catch {
    return false;
  }
}
