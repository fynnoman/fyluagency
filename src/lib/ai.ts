import * as openai from "./openai";
import * as ollama from "./ollama";

export type AIMessage = { role: "system" | "user" | "assistant"; content: string };

export type AISource = "openai" | "ollama" | "none";

/**
 * Einheitlicher Chat-Endpunkt. Reihenfolge: erst OpenAI (wenn Key hinterlegt),
 * dann Ollama (wenn erreichbar). Wirft, wenn beide nicht verfügbar sind, damit
 * die Aufrufer sauber auf Heuristik zurückfallen können.
 */
export async function chat(
  messages: AIMessage[],
  opts?: { json?: boolean; temperature?: number },
): Promise<{ content: string; source: AISource }> {
  if (await openai.isConfigured()) {
    try {
      const content = await openai.chat(messages, opts);
      return { content, source: "openai" };
    } catch {
      // fall through to Ollama
    }
  }
  if (await ollama.isReachable()) {
    const content = await ollama.chat(messages, opts);
    return { content, source: "ollama" };
  }
  throw new Error("Kein KI-Backend verfügbar (OpenAI-Key fehlt und Ollama offline).");
}

/** True, wenn irgendein Backend antworten kann. */
export async function isAnyReachable(): Promise<boolean> {
  if (await openai.isConfigured()) return true;
  if (await ollama.isReachable()) return true;
  return false;
}
