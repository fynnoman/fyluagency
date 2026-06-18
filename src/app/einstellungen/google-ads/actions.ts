"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export async function saveGoogleAds(formData: FormData) {
  await getSettings();
  await prisma.settings.update({
    where: { id: 1 },
    data: {
      googleAdsCustomerId: emptyToNull(formData.get("googleAdsCustomerId")),
      googleAdsDeveloperToken: emptyToNull(formData.get("googleAdsDeveloperToken")),
      googleAdsRefreshToken: emptyToNull(formData.get("googleAdsRefreshToken")),
    },
  });
  revalidatePath("/einstellungen/google-ads");
  revalidatePath("/");
}

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = String(v || "").trim();
  return s === "" ? null : s;
}
