import Link from "next/link";
import { ChevronLeft, ExternalLink } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { getSettings } from "@/lib/settings";
import { fetchGoogleAdsSummary } from "@/lib/google-ads";
import { formatMoney } from "@/lib/format";
import { saveGoogleAds } from "./actions";

export const dynamic = "force-dynamic";

export default async function GoogleAdsSettings() {
  const settings = await getSettings();
  const summary = await fetchGoogleAdsSummary();
  const cost = summary.costMicros ? summary.costMicros / 1_000_000 : 0;

  return (
    <>
      <Link
        href="/einstellungen"
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text mb-3"
      >
        <ChevronLeft size={14} /> Zu den Einstellungen
      </Link>

      <PageHeader
        title="Google Ads"
        subtitle="Verbinde dein Google-Ads-Konto, um Budget, Klicks und Conversions im Dashboard zu sehen."
      />

      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
        <section className="card p-6 space-y-5">
          <h2 className="font-semibold text-sm">Anmeldedaten</h2>
          <form action={saveGoogleAds} className="space-y-4">
            <div>
              <label className="label">Google Ads Customer ID</label>
              <input
                className="input"
                name="googleAdsCustomerId"
                defaultValue={settings.googleAdsCustomerId || ""}
                placeholder="123-456-7890"
              />
            </div>
            <div>
              <label className="label">Developer Token</label>
              <input
                className="input"
                name="googleAdsDeveloperToken"
                defaultValue={settings.googleAdsDeveloperToken || ""}
                type="password"
              />
            </div>
            <div>
              <label className="label">OAuth Refresh Token</label>
              <input
                className="input"
                name="googleAdsRefreshToken"
                defaultValue={settings.googleAdsRefreshToken || ""}
                type="password"
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Speichern
            </button>
          </form>

          {summary.configured && summary.error && (
            <div className="pill pill-negative">{summary.error}</div>
          )}
        </section>

        <aside className="space-y-5">
          <section className="card p-5">
            <h3 className="font-semibold text-sm mb-3">Aktuelle Daten</h3>
            {!summary.configured ? (
              <p className="text-sm text-text-muted">
                Noch nicht verbunden. Trag die drei Felder links ein.
              </p>
            ) : summary.error ? (
              <p className="text-sm text-negative">
                Verbindung steht — aber der API-Call ist gescheitert. Häufig liegt
                es am Developer-Token (nicht freigegeben), an Manager-Account-Setup
                oder fehlenden OAuth-Scopes.
              </p>
            ) : (
              <div className="space-y-2 text-sm">
                <Row label="Ausgaben" value={formatMoney(cost)} />
                <Row label="Conversions" value={String(Math.round(summary.conversions ?? 0))} />
                <Row label="Klicks" value={String(summary.clicks ?? 0)} muted />
                <Row label="Impressions" value={String(summary.impressions ?? 0)} muted />
                <div className="text-xs text-text-dim pt-2">
                  Zeitraum: {summary.range}
                </div>
              </div>
            )}
          </section>

          <section className="card p-5 text-sm text-text-muted space-y-3">
            <h3 className="font-semibold text-text">Setup in 5 Schritten</h3>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                <a
                  href="https://ads.google.com/aw/apicenter"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline inline-flex items-center gap-1"
                >
                  Developer Token im API Center beantragen <ExternalLink size={12} />
                </a>
              </li>
              <li>
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline inline-flex items-center gap-1"
                >
                  OAuth Client ID erstellen <ExternalLink size={12} />
                </a>
                {" "}und ID/Secret in <code className="text-xs bg-surface-2 px-1 rounded">.env</code> setzen:
                <pre className="bg-surface-2 p-2 mt-2 rounded text-xs">{`GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...`}</pre>
              </li>
              <li>
                <a
                  href="https://developers.google.com/oauthplayground/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline inline-flex items-center gap-1"
                >
                  OAuth Playground öffnen <ExternalLink size={12} />
                </a>
                , Scope <code className="text-xs bg-surface-2 px-1 rounded">https://www.googleapis.com/auth/adwords</code> wählen,
                eigene Credentials nutzen, Authorize, Refresh-Token kopieren.
              </li>
              <li>Customer ID aus Google Ads kopieren (10-stellig).</li>
              <li>Hier oben in die Felder eintragen und speichern.</li>
            </ol>
          </section>
        </aside>
      </div>
    </>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-muted">{label}</span>
      <span className={`tabular-nums font-medium ${muted ? "text-text-muted" : ""}`}>
        {value}
      </span>
    </div>
  );
}
