"use client";

import { useTransition } from "react";
import { moveLeadStatus, type LeadStatus } from "../actions";

const STATUSES: { key: LeadStatus; label: string; color: string }[] = [
  { key: "new", label: "Neu", color: "info" },
  { key: "contacted", label: "Kontaktiert", color: "info" },
  { key: "meeting", label: "Termin", color: "warning" },
  { key: "proposal", label: "Angebot raus", color: "warning" },
  { key: "won", label: "Gewonnen", color: "positive" },
  { key: "lost", label: "Verloren", color: "negative" },
];

export default function StatusButtons({
  leadId,
  current,
}: {
  leadId: string;
  current: string;
}) {
  const [pending, start] = useTransition();
  return (
    <div className={`flex flex-wrap gap-1.5 ${pending ? "opacity-50" : ""}`}>
      {STATUSES.map((s) => {
        const active = s.key === current;
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => start(() => moveLeadStatus(leadId, s.key))}
            className={`pill ${active ? `pill-${s.color}` : ""} ${
              active ? "ring-2 ring-offset-1 ring-current" : "opacity-50 hover:opacity-100"
            } transition`}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
