"use client";

import { Trash2 } from "lucide-react";
import { deleteCost } from "../actions";
import { formatMoney, formatDate } from "@/lib/format";
import { useTransition } from "react";

const FREQ_LABEL: Record<string, string> = {
  once: "einmalig",
  monthly: "monatlich",
  yearly: "jährlich",
};

export default function CostRow({
  cost,
  customerId,
}: {
  cost: {
    id: string;
    description: string;
    amount: number;
    frequency: string;
    dueDate: Date | null;
  };
  customerId: string;
}) {
  const [pending, start] = useTransition();
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 ${
        pending ? "opacity-50" : ""
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{cost.description}</div>
        <div className="text-xs text-text-muted mt-0.5 flex items-center gap-2">
          <span className="pill">{FREQ_LABEL[cost.frequency] || cost.frequency}</span>
          {cost.dueDate && <span>fällig {formatDate(cost.dueDate)}</span>}
        </div>
      </div>
      <div className="text-sm tabular-nums font-medium">
        {formatMoney(cost.amount)}
      </div>
      <button
        type="button"
        onClick={() => {
          if (confirm("Kosten-Eintrag löschen?")) {
            start(() => deleteCost(cost.id, customerId));
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
