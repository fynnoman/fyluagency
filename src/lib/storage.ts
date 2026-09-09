import fs from "node:fs/promises";
import path from "node:path";
import { put, del } from "@vercel/blob";

/**
 * Datei ablegen. In Produktion (Vercel/Blob-Token vorhanden) geht die Datei
 * in Vercel Blob und wir bekommen eine öffentliche https-URL zurück. Lokal
 * ohne Blob-Token fällt es auf `public/uploads/...` zurück, damit die
 * Entwicklung ohne Cloud funktioniert.
 */
export async function saveUpload(
  key: string,
  data: Buffer,
  contentType?: string,
): Promise<{ url: string; storage: "blob" | "local" }> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(key, data, {
      access: "public",
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return { url: blob.url, storage: "blob" };
  }

  const uploadsRoot = path.join(process.cwd(), "public", "uploads");
  const filepath = path.join(uploadsRoot, key);
  await fs.mkdir(path.dirname(filepath), { recursive: true });
  await fs.writeFile(filepath, data);
  return { url: `/uploads/${key}`, storage: "local" };
}

/**
 * Datei löschen. Unterstützt beide Backends: erkennt Blob-URLs an https-Prefix.
 * Fehler werden geschluckt (Löschen ist bewusst best-effort).
 */
export async function removeUpload(urlOrPath: string): Promise<void> {
  if (!urlOrPath) return;
  try {
    if (urlOrPath.startsWith("https://") || urlOrPath.startsWith("http://")) {
      if (!process.env.BLOB_READ_WRITE_TOKEN) return;
      await del(urlOrPath);
      return;
    }
    const rel = urlOrPath.startsWith("/") ? urlOrPath.slice(1) : urlOrPath;
    const abs = path.join(process.cwd(), "public", rel);
    await fs.unlink(abs);
  } catch {
    /* best-effort */
  }
}
