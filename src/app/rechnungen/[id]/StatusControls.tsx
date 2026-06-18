"use client";

import { useTransition } from "react";
import { updateInvoiceStatus, deleteInvoice } from "../actions";

const STATUSES: { key: "draft" | "sent" | "paid" | "overdue"; label: string; color: string }[] = [
  { key: "draft", label: "Entwurf", color: "" },
  { key: "sent", label: "Verschickt", color: "info" },
  { key: "paid", label: "Bezahlt", color: "positive" },
  { key: "overdue", label: "Überfällig", color: "negative" },
];

export default function StatusControls({
  invoiceId,
  current,
}: {
  invoiceId: string;
  current: string;
}) {
  const [pending, start] = useTransition();
  return (
    <div className={`flex flex-wrap gap-2 ${pending ? "opacity-50" : ""}`}>
      {STATUSES.map((s) => {
        const active = s.key === current;
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => start(() => updateInvoiceStatus(invoiceId, s.key))}
            className={`pill ${active ? `pill-${s.color}` : ""} ${
              active ? "ring-2 ring-offset-1 ring-current" : "opacity-50 hover:opacity-100"
            }`}
          >
            {s.label}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => {
          if (confirm("Rechnung wirklich löschen?")) {
            start(() => deleteInvoice(invoiceId));
          }
        }}
        className="btn btn-danger ml-auto"
      >
        Löschen
      </button>
    </div>
  );
}
