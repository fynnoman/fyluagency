import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const COOKIE_NAME = "fylu_workspace_id";
const DEFAULT_WORKSPACE_ID = "ws_default_fylu";

async function readCookieWorkspaceId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE_NAME)?.value ?? null;
}

/** Resolve the current workspaceId for the request.
 *  Order: cookie → default workspace (backfilled by migration) → first workspace in DB.
 *  Cached per render so repeated calls share one DB round-trip. */
export const getCurrentWorkspaceId = cache(async (): Promise<string> => {
  const fromCookie = await readCookieWorkspaceId();
  if (fromCookie) {
    const exists = await prisma.workspace.findUnique({
      where: { id: fromCookie },
      select: { id: true },
    });
    if (exists) return exists.id;
  }
  const def = await prisma.workspace.findUnique({
    where: { id: DEFAULT_WORKSPACE_ID },
    select: { id: true },
  });
  if (def) return def.id;
  const first = await prisma.workspace.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (first) return first.id;
  // Falls die Migration nie lief oder alle Workspaces gelöscht wurden:
  // einen Default anlegen, damit die App weiter funktioniert.
  const created = await prisma.workspace.create({
    data: { id: DEFAULT_WORKSPACE_ID, name: "Fylu Marketing & Design", slug: "default" },
    select: { id: true },
  });
  return created.id;
});

export const listWorkspaces = cache(async () => {
  return prisma.workspace.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, slug: true, createdAt: true },
  });
});

export const WORKSPACE_COOKIE_NAME = COOKIE_NAME;
