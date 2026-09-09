"use client";

import { useTransition } from "react";

export default function DeleteLeadButton({
  action,
}: {
  action: () => Promise<void>;
}) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      className="btn btn-danger"
      disabled={pending}
      onClick={() => {
        if (!confirm("Lead wirklich löschen?")) return;
        start(() => action());
      }}
    >
      {pending ? "Lösche…" : "Lead löschen"}
    </button>
  );
}
