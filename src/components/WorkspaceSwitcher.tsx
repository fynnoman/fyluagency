"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/format";
import { toast } from "sonner";

type Workspace = {
  id: string;
  name: string;
  slug: string;
};

type Props = {
  initialItems: Workspace[];
  initialCurrentId: string;
};

export default function WorkspaceSwitcher({ initialItems, initialCurrentId }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<Workspace[]>(initialItems);
  const [currentId, setCurrentId] = useState<string>(initialCurrentId);
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const current = items.find((w) => w.id === currentId) ?? items[0];

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  useEffect(() => {
    if (createOpen) {
      const t = setTimeout(() => nameInputRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
  }, [createOpen]);

  async function switchTo(id: string) {
    if (id === currentId) {
      setOpen(false);
      return;
    }
    setSwitchingTo(id);
    try {
      const res = await fetch("/api/workspaces/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(await res.text());
      setCurrentId(id);
      setOpen(false);
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error("Wechsel fehlgeschlagen", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSwitchingTo(null);
    }
  }

  async function createWorkspace(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Anlegen fehlgeschlagen");
      }
      const data = (await res.json()) as { workspace: Workspace };
      setItems((prev) => [...prev, data.workspace]);
      setName("");
      setCreateOpen(false);
      // Direkt in den neuen Workspace wechseln
      await switchTo(data.workspace.id);
      toast.success(`Workspace „${data.workspace.name}" angelegt`);
    } catch (err) {
      toast.error("Anlegen fehlgeschlagen", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setCreating(false);
    }
  }

  const initials = (current?.name ?? "F")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm hover:bg-surface-2 transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="grid place-items-center w-6 h-6 rounded bg-accent text-accent-fg text-[10px] font-semibold">
          {initials}
        </span>
        <span className="font-medium truncate max-w-[180px]">
          {current?.name ?? "Workspace"}
        </span>
        <ChevronDown size={14} className="text-text-muted shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-40 w-72 rounded-lg border border-border bg-surface shadow-lg overflow-hidden">
          <div className="px-3 py-2 text-xs uppercase tracking-wide text-text-muted border-b border-border">
            Workspaces
          </div>
          <ul role="listbox" className="max-h-72 overflow-auto py-1">
            {items.map((w) => {
              const active = w.id === currentId;
              const loading = switchingTo === w.id;
              return (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => switchTo(w.id)}
                    disabled={loading}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-surface-2",
                      active && "bg-surface-2"
                    )}
                  >
                    <span className="grid place-items-center w-6 h-6 rounded bg-accent/10 text-accent text-[10px] font-semibold shrink-0">
                      {w.name
                        .split(/\s+/)
                        .map((s) => s[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                    <span className="flex-1 min-w-0">
                      <div className="truncate font-medium">{w.name}</div>
                      <div className="truncate text-xs text-text-muted">
                        {w.slug}
                      </div>
                    </span>
                    {loading ? (
                      <Loader2 size={14} className="animate-spin text-text-muted" />
                    ) : active ? (
                      <Check size={14} className="text-accent" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-border p-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setCreateOpen(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-surface-2"
            >
              <Plus size={14} /> Neuer Workspace
            </button>
          </div>
        </div>
      )}

      {createOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setCreateOpen(false);
          }}
        >
          <form
            onSubmit={createWorkspace}
            className="w-full max-w-sm rounded-lg border border-border bg-surface shadow-xl"
          >
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold">Neuer Workspace</h2>
              <p className="text-xs text-text-muted mt-1">
                Jeder Workspace hat eigene Kunden, Leads, Rechnungen und
                Einstellungen.
              </p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <label className="block text-sm">
                <span className="block text-xs text-text-muted mb-1">Name</span>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z. B. Fylu Marketing, Zweitfirma, Testprojekt"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:border-accent"
                  required
                  maxLength={80}
                />
              </label>
            </div>
            <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="btn btn-ghost"
                disabled={creating}
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={creating || !name.trim()}
              >
                {creating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Wird angelegt …
                  </>
                ) : (
                  <>
                    <Plus size={14} /> Anlegen
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
