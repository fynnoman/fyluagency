"use client";

import { useTransition } from "react";

export default function DeleteCustomerButton({
  customerName,
  action,
}: {
  customerName: string;
  action: () => Promise<void>;
}) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      className="btn btn-danger"
      disabled={pending}
      onClick={() => {
        const msg = `${customerName} wirklich löschen? Alle Kosten, Rechnungen und Leistungspositionen werden ebenfalls gelöscht.`;
        if (!confirm(msg)) return;
        start(() => action());
      }}
    >
      {pending ? "Lösche…" : "Kunde löschen"}
    </button>
  );
}
