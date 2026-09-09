"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function ScopeUpload({
  customerId,
  currentFilename,
  currentPath,
}: {
  customerId: string;
  currentFilename: string | null;
  currentPath: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [addedCount, setAddedCount] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function onFile(file: File) {
    setBusy(true);
    setStatus("Lade PDF hoch, danach liest die KI die Positionen...");
    setAddedCount(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("customerId", customerId);
      const res = await fetch("/api/upload-scope", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data?.error || "Upload fehlgeschlagen.");
        return;
      }
      setStatus(
        data.parsedCount > 0
          ? `${data.parsedCount} Positionen erkannt und übernommen.`
          : "Datei gespeichert, aber keine Positionen erkannt. Bitte manuell ergänzen.",
      );
      setAddedCount(data.parsedCount ?? 0);
      router.refresh();
    } catch (err) {
      setStatus(
        `Fehler: ${err instanceof Error ? err.message : "unbekannt"}`,
      );
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
          {currentFilename ? "Anderes PDF hochladen" : "Leistungsumfang-PDF hochladen"}
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
      </div>

      {status ? (
        <p className="text-xs text-text-muted">{status}</p>
      ) : (
        !currentFilename && (
          <p className="text-xs text-text-muted">
            Die KI liest die einzelnen Leistungspositionen aus dem Dokument und
            trägt sie unten in die Liste ein.
          </p>
        )
      )}

      {addedCount != null && addedCount > 0 && (
        <p className="text-xs text-positive">Schritt 2 automatisch abgehakt.</p>
      )}
    </div>
  );
}
