"use client";

import { Trash2 } from "lucide-react";
import { toggleIssue, deleteIssue } from "../actions";
import { formatMoney } from "@/lib/format";
import { useTransition } from "react";

export default function IssueRow({
  issue,
  customerId,
}: {
  issue: {
    id: string;
    title: string;
    description: string | null;
    price: number | null;
    done: boolean;
  };
  customerId: string;
}) {
  const [pending, start] = useTransition();
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 ${
        pending ? "opacity-50" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => start(() => toggleIssue(issue.id, customerId))}
        aria-label={issue.done ? "Wiederöffnen" : "Erledigt markieren"}
        className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition ${
          issue.done
            ? "bg-positive border-positive text-white"
            : "border-border-strong hover:border-accent"
        }`}
      >
        {issue.done && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${issue.done ? "line-through text-text-muted" : ""}`}>
          {issue.title}
        </div>
        {issue.description && (
          <div className="text-xs text-text-muted mt-0.5">
            {issue.description}
          </div>
        )}
      </div>

      {issue.price != null && (
        <div className="text-sm tabular-nums text-text-muted">
          {formatMoney(issue.price)}
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          if (confirm("Aufgabe löschen?")) {
            start(() => deleteIssue(issue.id, customerId));
          }
        }}
        className="text-text-dim hover:text-negative p-1"
        aria-label="Löschen"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
