"use client";

import { useTransition } from "react";
import { toggleProcessStep } from "../actions";
import ScopeUpload from "./ScopeUpload";
import OfferUpload from "./OfferUpload";

type StepKey =
  | "processOfferAccepted"
  | "processScopeDefined"
  | "processPreferencesCollected"
  | "processDownPaymentPaid"
  | "processProjectCompleted"
  | "processFinalInvoicePaid"
  | "processReferenceCollected";

const STEPS: { key: StepKey; label: string }[] = [
  { key: "processOfferAccepted", label: "Angebot angenommen" },
  { key: "processScopeDefined", label: "Leistungsumfang bestimmt" },
  {
    key: "processPreferencesCollected",
    label: "Geschmack, Wünsche und Vorstellungen bestimmt",
  },
  { key: "processDownPaymentPaid", label: "Abschlagsrechnung bezahlt" },
  { key: "processProjectCompleted", label: "Projekt fertiggestellt" },
  { key: "processFinalInvoicePaid", label: "Schlussrechnung bezahlt" },
  { key: "processReferenceCollected", label: "Referenz eingesammelt" },
];

export default function ProcessCard({
  customerId,
  values,
  scopeDocument,
  offerDocument,
}: {
  customerId: string;
  values: Record<StepKey, boolean>;
  scopeDocument: {
    filename: string | null;
    path: string | null;
    uploadedAt: Date | null;
  };
  offerDocument: {
    filename: string | null;
    path: string | null;
    uploadedAt: Date | null;
    amount: number | null;
  };
}) {
  const [pending, start] = useTransition();
  const done = STEPS.filter((s) => values[s.key]).length;

  return (
    <section className="card">
      <header className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-sm">Prozess</h2>
          <p className="text-xs text-text-muted">
            {done} von {STEPS.length} Schritten erledigt
          </p>
        </div>
        <div className="text-xs text-text-muted tabular-nums">
          {Math.round((done / STEPS.length) * 100)} %
        </div>
      </header>

      <ol className="divide-y divide-border">
        {STEPS.map((step, idx) => {
          const active = values[step.key];
          return (
            <li
              key={step.key}
              className={`px-5 py-3 ${pending ? "opacity-60" : ""}`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() =>
                    start(() =>
                      toggleProcessStep(customerId, step.key, !active),
                    )
                  }
                  aria-label={active ? "Häkchen entfernen" : "Erledigt"}
                  className={`shrink-0 mt-0.5 w-5 h-5 rounded-full border grid place-items-center ${
                    active
                      ? "bg-positive border-positive"
                      : "border-border hover:border-accent"
                  }`}
                >
                  {active && (
                    <svg viewBox="0 0 12 12" className="w-3 h-3 text-white">
                      <path
                        d="M2 6l2.5 2.5L10 3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-text-muted tabular-nums">
                      {idx + 1}.
                    </span>
                    <span
                      className={`text-sm ${
                        active ? "line-through text-text-muted" : "text-text"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>

                  {step.key === "processOfferAccepted" && (
                    <div className="mt-2">
                      <OfferUpload
                        customerId={customerId}
                        currentFilename={offerDocument.filename}
                        currentPath={offerDocument.path}
                        currentAmount={offerDocument.amount}
                      />
                    </div>
                  )}

                  {step.key === "processScopeDefined" && (
                    <div className="mt-2">
                      <ScopeUpload
                        customerId={customerId}
                        currentFilename={scopeDocument.filename}
                        currentPath={scopeDocument.path}
                      />
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
