"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";

export default function InvoiceUpload({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);

  const handle = async (file: File) => {
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("customerId", customerId);
    try {
      const res = await fetch("/api/upload-invoice", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Upload fehlgeschlagen");
      }
      const data = await res.json();
      const summary = data.extractedTotal
        ? `Brutto erkannt: ${data.extractedTotal.toFixed(2)} €`
        : "Datei gespeichert — Beträge nicht erkannt, manuell ergänzen.";
      toast.success(summary);
      start(() => router.refresh());
    } catch (e) {
      toast.error(String(e instanceof Error ? e.message : e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <label
      className={`flex items-center justify-center gap-2 cursor-pointer border-2 border-dashed border-border-strong rounded-lg px-4 py-6 text-sm text-text-muted hover:border-accent hover:bg-surface-2 transition ${
        uploading || pending ? "opacity-50" : ""
      }`}
    >
      <Upload size={16} />
      <span>
        {uploading
          ? "Wird analysiert…"
          : "PDF hier ablegen oder klicken um auszuwählen"}
      </span>
      <input
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handle(f);
        }}
      />
    </label>
  );
}
