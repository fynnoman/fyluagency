"use client";

import { useState, useTransition } from "react";
import { testOpenAI } from "./actions";

export default function OpenAITestButton({ hasKey }: { hasKey: boolean }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<
    { ok: boolean; message: string } | null
  >(null);

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="btn btn-secondary"
        disabled={pending || !hasKey}
        onClick={() =>
          start(async () => {
            setResult(null);
            const r = await testOpenAI();
            setResult(r);
          })
        }
      >
        {pending ? "Prüfe…" : "Verbindung testen"}
      </button>
      {!hasKey && (
        <p className="text-xs text-text-muted">
          Erst Key speichern, dann testen.
        </p>
      )}
      {result && (
        <p
          className={`text-xs ${
            result.ok ? "text-positive" : "text-negative"
          }`}
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
