"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  return (
    <div className="max-w-xl mx-auto py-16">
      <div className="card p-8 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-negative/10 text-negative">
          <AlertCircle size={20} />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Etwas ist schiefgelaufen</h1>
          <p className="text-sm text-text-muted mt-2">
            Die Seite konnte nicht geladen werden. Details stehen in den
            Server-Logs.
          </p>
          {error.digest && (
            <p className="text-xs font-mono text-text-dim mt-3">
              Digest: {error.digest}
            </p>
          )}
        </div>
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="btn btn-primary"
          >
            <RotateCw size={14} /> Erneut versuchen
          </button>
          <Link href="/" className="btn btn-secondary">
            Zum Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
