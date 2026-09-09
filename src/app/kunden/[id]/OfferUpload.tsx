"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

function formatEur(n: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

export default function OfferUpload({
  customerId,
  currentFilename,
  currentPath,
  currentAmount,
}: {
  customerId: string;
  currentFilename: string | null;
  currentPath: string | null;
  currentAmount: number | null;
}) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function onFile(file: File) {
    setBusy(true);
    setStatus("Lade PDF hoch, danach liest die KI den Angebotsbetrag...");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("customerId", customerId);
      const res = await fetch("/api/upload-offer", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data?.error || "Upload fehlgeschlagen.");
        return;
      }
      setStatus(
        data.offerAmount != null
          ? `Angebotsbetrag erkannt: ${formatEur(data.offerAmount)}.`
          : "Datei gespeichert, aber kein Betrag erkennbar. Bitte manuell prüfen.",
      );
      router.refresh();
    } catch (err) {
      setStatus(`Fehler: ${err instanceof Error ? err.message : "unbekannt"}`);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <label
          className={`btn btn-secondary cursor-pointer ${busy ? "opacity-60 pointer-events-none" : ""}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
            }}
          />
          {currentFilename ? "Anderes Angebot hochladen" : "Angebot-PDF hochladen"}
        </label>

        {currentFilename && currentPath && (
          <a
            href={currentPath}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent hover:underline truncate max-w-[240px]"
            title={currentFilename}
          >
            {currentFilename}
          </a>
        )}

        {currentAmount != null && (
          <span className="text-xs font-medium text-positive tabular-nums">
            {formatEur(currentAmount)}
          </span>
        )}
      </div>

      {status ? (
        <p className="text-xs text-text-muted">{status}</p>
      ) : (
        !currentFilename && (
          <p className="text-xs text-text-muted">
            Die KI liest den Angebotsbetrag aus dem PDF und hakt diesen Schritt automatisch ab.
          </p>
        )
      )}
    </div>
  );
}
