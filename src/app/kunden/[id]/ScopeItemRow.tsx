"use client";

import { useTransition } from "react";
import { toggleScopeItem, deleteScopeItem } from "../actions";
import { formatMoney } from "@/lib/format";

export default function ScopeItemRow({
  item,
  customerId,
}: {
  item: {
    id: string;
    title: string;
    details: string | null;
    quantity: number;
    unitPrice: number | null;
    done: boolean;
  };
  customerId: string;
}) {
  const [pending, start] = useTransition();
  const lineTotal = item.unitPrice != null ? item.unitPrice * item.quantity : null;

  return (
    <div
      className={`flex items-start gap-3 px-5 py-3 border-b border-border ${
        pending ? "opacity-60" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => start(() => toggleScopeItem(item.id, customerId))}
        aria-label={item.done ? "Wiederöffnen" : "Erledigt markieren"}
        className={`shrink-0 mt-0.5 w-4 h-4 rounded-sm border ${
          item.done
            ? "bg-positive border-positive"
            : "border-border hover:border-accent"
        }`}
      >
        {item.done && (
          <svg viewBox="0 0 12 12" className="w-full h-full text-white">
            <path
              d="M2 6l2.5 2.5L10 3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div
          className={`text-sm font-medium ${
            item.done ? "line-through text-text-muted" : ""
          }`}
        >
          {item.title}
        </div>
        {item.details && (
          <div className="text-xs text-text-muted mt-0.5 whitespace-pre-wrap">
            {item.details}
          </div>
        )}
      </div>

      <div className="text-xs text-text-muted shrink-0 text-right tabular-nums">
        {item.quantity !== 1 && <div>×{item.quantity}</div>}
        {lineTotal != null && <div>{formatMoney(lineTotal)}</div>}
      </div>

      <button
        type="button"
        className="text-xs text-text-muted hover:text-negative"
        onClick={() => {
          if (confirm(`"${item.title}" wirklich löschen?`)) {
            start(() => deleteScopeItem(item.id, customerId));
          }
        }}
        aria-label="Löschen"
      >
        ✕
      </button>
    </div>
  );
}
