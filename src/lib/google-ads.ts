import { getSettings } from "./settings";

export type GoogleAdsSummary = {
  configured: boolean;
  error?: string;
  costMicros?: number;
  conversions?: number;
  clicks?: number;
  impressions?: number;
  range?: string;
};

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ADS_API = "https://googleads.googleapis.com/v18";

/**
 * Fetches a fresh access token from Google's OAuth endpoint using the stored
 * refresh token. Requires NEXT_PUBLIC_GOOGLE_CLIENT_ID and
 * GOOGLE_CLIENT_SECRET in env. We deliberately keep secrets in env (not DB)
 * — the rest of the OAuth state lives in Settings.
 */
async function getAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "OAuth Client ID/Secret nicht in .env gesetzt — siehe Setup-Anleitung."
    );
  }
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Token refresh failed (${res.status}): ${txt}`);
  }
  const data = (await res.json()) as { access_token?: string; error?: string };
  if (!data.access_token) throw new Error(`No access token: ${data.error}`);
  return data.access_token;
}

/**
 * Pull the last 30 days of headline metrics across the connected
 * customer ID. Aggregates cost/clicks/conversions/impressions.
 */
export async function fetchGoogleAdsSummary(): Promise<GoogleAdsSummary> {
  const settings = await getSettings();
  if (
    !settings.googleAdsCustomerId ||
    !settings.googleAdsRefreshToken ||
    !settings.googleAdsDeveloperToken
  ) {
    return { configured: false };
  }

  try {
    const accessToken = await getAccessToken(settings.googleAdsRefreshToken);
    const customerId = settings.googleAdsCustomerId.replace(/-/g, "");

    const gaql = `
      SELECT
        metrics.cost_micros,
        metrics.conversions,
        metrics.clicks,
        metrics.impressions
      FROM customer
      WHERE segments.date DURING LAST_30_DAYS
    `.trim();

    const res = await fetch(
      `${ADS_API}/customers/${customerId}/googleAds:search`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "developer-token": settings.googleAdsDeveloperToken,
          "Content-Type": "application/json",
          // For manager accounts: also set "login-customer-id"
        },
        body: JSON.stringify({ query: gaql }),
        signal: AbortSignal.timeout(15_000),
      }
    );

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { configured: true, error: `Google Ads API ${res.status}: ${txt.slice(0, 200)}` };
    }

    type Row = {
      metrics?: {
        costMicros?: string;
        conversions?: number;
        clicks?: string;
        impressions?: string;
      };
    };
    const data = (await res.json()) as { results?: Row[] };
    let cost = 0;
    let conv = 0;
    let clicks = 0;
    let impr = 0;
    for (const row of data.results ?? []) {
      cost += Number(row.metrics?.costMicros ?? 0);
      conv += Number(row.metrics?.conversions ?? 0);
      clicks += Number(row.metrics?.clicks ?? 0);
      impr += Number(row.metrics?.impressions ?? 0);
    }
    return {
      configured: true,
      costMicros: cost,
      conversions: conv,
      clicks,
      impressions: impr,
      range: "letzte 30 Tage",
    };
  } catch (e) {
    return {
      configured: true,
      error: String(e instanceof Error ? e.message : e),
    };
  }
}
