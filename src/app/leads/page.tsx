import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import PageHeader from "@/components/PageHeader";
import { formatMoney, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const COLUMNS = [
  { key: "new", label: "Neu", color: "info" },
  { key: "contacted", label: "Kontaktiert", color: "info" },
  { key: "meeting", label: "Termin", color: "warning" },
  { key: "proposal", label: "Angebot raus", color: "warning" },
  { key: "won", label: "Gewonnen", color: "positive" },
  { key: "lost", label: "Verloren", color: "negative" },
] as const;

export default async function LeadsPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const leads = await prisma.lead.findMany({
    where: { workspaceId },
    orderBy: [{ updatedAt: "desc" }],
    take: 500,
  });

  const totalPipeline = leads
    .filter((l) => l.status !== "lost" && l.status !== "won")
    .reduce((s, l) => s + (l.expectedValue || 0), 0);
  const wonValue = leads
    .filter((l) => l.status === "won")
    .reduce((s, l) => s + (l.expectedValue || 0), 0);

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle={`Pipeline: ${formatMoney(totalPipeline)} · Gewonnen: ${formatMoney(wonValue)}`}
        actions={
          <Link href="/leads/neu" className="btn btn-primary">
            <Plus size={14} /> Neuer Lead
          </Link>
        }
      />

      <div className="grid grid-cols-[repeat(6,minmax(220px,1fr))] gap-3 overflow-x-auto pb-2">
        {COLUMNS.map((col) => {
          const items = leads.filter((l) => l.status === col.key);
          const colTotal = items.reduce((s, l) => s + (l.expectedValue || 0), 0);
          return (
            <div key={col.key} className="card p-3 min-h-[300px] flex flex-col">
              <header className="flex items-center justify-between mb-3">
                <div>
                  <div className={`pill pill-${col.color}`}>{col.label}</div>
                  <div className="text-xs text-text-muted mt-1 tabular-nums">
                    {items.length} · {formatMoney(colTotal)}
                  </div>
                </div>
              </header>
              <div className="space-y-2 flex-1">
                {items.length === 0 ? (
                  <div className="text-xs text-text-dim text-center py-6">
                    leer
                  </div>
                ) : (
                  items.map((l) => (
                    <Link
                      key={l.id}
                      href={`/leads/${l.id}`}
                      className="block bg-surface-2 hover:bg-surface border border-border rounded-lg p-3 text-sm transition"
                    >
                      <div className="font-medium truncate">{l.name}</div>
                      {l.company && (
                        <div className="text-xs text-text-muted truncate">
                          {l.company}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2 text-xs text-text-muted">
                        <span className="tabular-nums">
                          {l.expectedValue != null
                            ? formatMoney(l.expectedValue)
                            : "—"}
                        </span>
                        <span>{formatDate(l.lastContactAt || l.createdAt)}</span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
