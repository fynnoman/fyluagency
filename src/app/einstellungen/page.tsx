import Image from "next/image";
import PageHeader from "@/components/PageHeader";
import { getSettings } from "@/lib/settings";
import { saveSettings, uploadLogo, removeLogo } from "./actions";
import { isReachable } from "@/lib/ollama";
import OpenAITestButton from "./OpenAITestButton";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();
  const ollamaUp = await isReachable(settings.ollamaBaseUrl);

  return (
    <>
      <PageHeader
        title="Einstellungen"
        subtitle="Stammdaten, Rechnungslayout, Logo, lokale KI."
      />

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
        {/* Left column: forms */}
        <div className="space-y-6">
          {/* Business info */}
          <form action={saveSettings} className="card p-6 space-y-4">
            <h2 className="font-semibold text-sm">Stammdaten</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field name="businessName" label="Firmenname" defaultValue={settings.businessName} />
              <Field name="businessEmail" label="E-Mail" defaultValue={settings.businessEmail} />
              <Field name="businessPhone" label="Telefon" defaultValue={settings.businessPhone} />
              <Field name="taxId" label="USt-ID" defaultValue={settings.taxId} />
            </div>

            <div>
              <label className="label">Adresse (mehrzeilig)</label>
              <textarea
                className="textarea"
                name="businessAddress"
                rows={3}
                defaultValue={settings.businessAddress}
                placeholder="Musterstraße 1&#10;12345 Stadt"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field name="bankName" label="Bank" defaultValue={settings.bankName} />
              <Field name="iban" label="IBAN" defaultValue={settings.iban} />
              <Field name="bic" label="BIC" defaultValue={settings.bic} />
            </div>

            <h2 className="font-semibold text-sm pt-4 border-t border-border">
              Rechnungs-Setup
            </h2>

            <div className="grid sm:grid-cols-3 gap-4">
              <Field name="vatRate" label="MwSt. (%)" defaultValue={String(settings.vatRate)} inputMode="decimal" />
              <Field name="paymentTermsDays" label="Zahlungsziel (Tage)" defaultValue={String(settings.paymentTermsDays)} inputMode="numeric" />
              <Field name="invoiceNumberPrefix" label="Rechnungs-Präfix" defaultValue={settings.invoiceNumberPrefix} />
            </div>
            <div>
              <label className="label">Footer-Text auf Rechnung</label>
              <input className="input" name="invoiceFooter" defaultValue={settings.invoiceFooter} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field
                name="invoiceLayoutPrimary"
                label="Layout-Farbe (Headline)"
                defaultValue={settings.invoiceLayoutPrimary}
              />
              <Field
                name="invoiceLayoutAccent"
                label="Layout-Farbe (Akzent)"
                defaultValue={settings.invoiceLayoutAccent}
              />
            </div>

            <h2 className="font-semibold text-sm pt-4 border-t border-border">
              KI-Anbindung
            </h2>
            <p className="text-xs text-text-muted -mt-2">
              Priorität: OpenAI, wenn ein Key gesetzt ist. Sonst Ollama, wenn
              erreichbar. Sonst regelbasierter Fallback.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="openAIApiKey">
                  OpenAI API-Key
                </label>
                <input
                  className="input"
                  id="openAIApiKey"
                  name="openAIApiKey"
                  type="password"
                  defaultValue={settings.openAIApiKey || ""}
                  placeholder={settings.openAIApiKey ? "•••••• hinterlegt" : "sk-..."}
                  autoComplete="off"
                />
              </div>
              <Field
                name="openAIModel"
                label="OpenAI Modell"
                defaultValue={settings.openAIModel}
              />
              <div className="flex items-end">
                <OpenAITestButton hasKey={!!settings.openAIApiKey} />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-border">
              <Field
                name="ollamaBaseUrl"
                label="Ollama URL"
                defaultValue={settings.ollamaBaseUrl}
              />
              <Field
                name="ollamaModel"
                label="Ollama Modell"
                defaultValue={settings.ollamaModel}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <div className={`pill ${settings.openAIApiKey ? "pill-positive" : "pill-warning"}`}>
                {settings.openAIApiKey ? "OpenAI konfiguriert ✓" : "OpenAI ohne Key"}
              </div>
              <div className={`pill ${ollamaUp ? "pill-positive" : "pill-warning"}`}>
                {ollamaUp ? "Ollama erreichbar ✓" : "Ollama offline"}
              </div>
            </div>

            <div className="pt-2">
              <button type="submit" className="btn btn-primary">
                Speichern
              </button>
            </div>
          </form>
        </div>

        {/* Right column: logo + meta */}
        <aside className="space-y-6">
          <section className="card p-5">
            <h2 className="font-semibold text-sm mb-3">Logo</h2>
            <div className="aspect-[5/2] border border-dashed border-border-strong rounded-lg flex items-center justify-center bg-surface-2 mb-3 relative">
              {settings.logoPath ? (
                <Image
                  src={settings.logoPath}
                  alt="Logo"
                  fill
                  className="object-contain p-4"
                />
              ) : (
                <span className="text-sm text-text-muted">
                  Noch kein Logo hochgeladen
                </span>
              )}
            </div>
            <form action={uploadLogo} className="space-y-3">
              <input
                type="file"
                name="logo"
                accept="image/png,image/jpeg,image/svg+xml"
                className="input file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-accent file:text-accent-fg"
              />
              <button type="submit" className="btn btn-secondary">
                Logo hochladen
              </button>
            </form>
            {settings.logoPath && (
              <form action={removeLogo} className="mt-2">
                <button type="submit" className="btn btn-danger">
                  Entfernen
                </button>
              </form>
            )}
            <p className="text-xs text-text-muted mt-3">
              PNG, JPG oder SVG · wird automatisch auf jede Rechnung gedruckt.
            </p>
          </section>

          <section className="card p-5">
            <h2 className="font-semibold text-sm mb-2">Google Ads</h2>
            <p className="text-xs text-text-muted mb-3">
              Verbinde dein Google-Ads-Konto, um Budget &amp; Conversions im Dashboard zu sehen.
            </p>
            <a href="/einstellungen/google-ads" className="btn btn-secondary">
              Google Ads konfigurieren
            </a>
          </section>

          <section className="card p-5 text-sm text-text-muted space-y-2">
            <h2 className="font-semibold text-text mb-2">Ollama Setup</h2>
            <p>
              Lokale KI braucht <strong>Ollama</strong> auf deinem Mac. Installation einmalig:
            </p>
            <pre className="bg-surface-2 p-3 rounded-md text-xs overflow-x-auto">{`# Terminal:
brew install ollama
ollama serve &
ollama pull llama3.2`}</pre>
            <p>
              Sobald Ollama läuft, übernimmt sie das Parsen von Rechnungs-Text und
              das Extrahieren von Beträgen aus hochgeladenen PDFs. Bei Ausfall greift
              automatisch ein Heuristik-Parser.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}

function Field({
  name,
  label,
  defaultValue,
  inputMode,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  inputMode?: "decimal" | "numeric";
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input
        className="input"
        id={name}
        name={name}
        defaultValue={defaultValue}
        inputMode={inputMode}
      />
    </div>
  );
}
