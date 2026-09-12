import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { WORKSPACE_COOKIE_NAME } from "@/lib/workspace";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { id?: string };
  const id = (body.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  }
  const exists = await prisma.workspace.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists) {
    return NextResponse.json({ error: "Workspace nicht gefunden" }, { status: 404 });
  }
  const jar = await cookies();
  jar.set(WORKSPACE_COOKIE_NAME, id, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return NextResponse.json({ ok: true, currentId: id });
}
