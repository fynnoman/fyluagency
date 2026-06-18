import Link from "next/link";
import { Megaphone } from "lucide-react";
import { fetchGoogleAdsSummary } from "@/lib/google-ads";
import { formatMoney } from "@/lib/format";

export default async function GoogleAdsWidget() {
  let summary: Awaited<ReturnType<typeof fetchGoogleAdsSummary>>;
  try {
    summary = await fetchGoogleAdsSummary();
  } catch {
    summary = { configured: false };
  }
  const cost = summary.costMicros ? summary.costMicros / 1_000_000 : 0;

  return (
    <section className="card">
      <header className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Megaphone size={14} /> Google Ads
        </h2>
        <Link
          href="/einstellungen/google-ads"
          className="text-xs text-accent hover:underline"
        >
          {summary.configured ? "Einstellungen" : "Verbinden →"}
        </Link>
      </header>

      <div className="px-5 py-4">
        {!summary.configured ? (
          <p className="text-sm text-text-muted">
            Verbinde Google Ads in den Einstellungen, um Budget und Conversions
            hier zu sehen.
          </p>
        ) : summary.error ? (
          <p className="text-sm text-negative">{summary.error}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Cell label="Ausgaben" value={formatMoney(cost)} />
            <Cell
              label="Conversions"
              value={String(Math.round(summary.conversions ?? 0))}
            />
            <Cell label="Klicks" value={String(summary.clicks ?? 0)} muted />
            <Cell
              label="Impressions"
              value={String(summary.impressions ?? 0)}
              muted
            />
            <div className="col-span-2 text-xs text-text-dim pt-1">
              Zeitraum: {summary.range}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Cell({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-text-muted">{label}</div>
      <div
        className={`text-base font-semibold tabular-nums ${muted ? "text-text-muted" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}
