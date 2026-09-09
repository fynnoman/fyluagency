import fs from "node:fs/promises";
import path from "node:path";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const BUCKET = process.env.NEON_STORAGE_BUCKET || "fyluagency";

function hasS3Env(): boolean {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_ENDPOINT_URL_S3
  );
}

let cachedClient: S3Client | null = null;
function s3(): S3Client {
  if (cachedClient) return cachedClient;
  cachedClient = new S3Client({
    forcePathStyle: true,
  });
  return cachedClient;
}

function publicUrl(key: string): string {
  const endpoint = (process.env.AWS_ENDPOINT_URL_S3 || "").replace(/\/$/, "");
  return `${endpoint}/${BUCKET}/${key}`;
}

/**
 * Datei ablegen. In Produktion (Neon Object Storage / S3-Env-Vars vorhanden)
 * geht die Datei in den Neon-Bucket und wir bekommen eine öffentliche
 * https-URL zurück (Bucket muss public_read sein). Lokal ohne S3-Env fällt
 * es auf `public/uploads/...` zurück, damit die Entwicklung ohne Cloud
 * funktioniert.
 */
export async function saveUpload(
  key: string,
  data: Buffer,
  contentType?: string,
): Promise<{ url: string; storage: "s3" | "local" }> {
  if (hasS3Env()) {
    await s3().send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: data,
        ContentType: contentType,
      }),
    );
    return { url: publicUrl(key), storage: "s3" };
  }

  const uploadsRoot = path.join(process.cwd(), "public", "uploads");
  const filepath = path.join(uploadsRoot, key);
  await fs.mkdir(path.dirname(filepath), { recursive: true });
  await fs.writeFile(filepath, data);
  return { url: `/uploads/${key}`, storage: "local" };
}

/**
 * Datei löschen. Unterstützt beide Backends: erkennt S3-URLs am Endpoint
 * bzw. https-Prefix. Fehler werden geschluckt (Löschen ist bewusst best-effort).
 */
export async function removeUpload(urlOrPath: string): Promise<void> {
  if (!urlOrPath) return;
  try {
    if (urlOrPath.startsWith("https://") || urlOrPath.startsWith("http://")) {
      if (!hasS3Env()) return;
      const endpoint = (process.env.AWS_ENDPOINT_URL_S3 || "").replace(/\/$/, "");
      const prefix = `${endpoint}/${BUCKET}/`;
      if (!urlOrPath.startsWith(prefix)) return;
      const key = urlOrPath.slice(prefix.length);
      await s3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
      return;
    }
    const rel = urlOrPath.startsWith("/") ? urlOrPath.slice(1) : urlOrPath;
    const abs = path.join(process.cwd(), "public", rel);
    await fs.unlink(abs);
  } catch {
    /* best-effort */
  }
}
