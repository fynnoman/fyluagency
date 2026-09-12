import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export async function GET() {
  const [items, current] = await Promise.all([
    prisma.workspace.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, slug: true, createdAt: true },
    }),
    getCurrentWorkspaceId(),
  ]);
  return NextResponse.json({ items, currentId: current });
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    slug?: string;
  };
  const name = (body.name ?? "").trim();
  if (!name) {
    return NextResponse.json(
      { error: "Name ist erforderlich." },
      { status: 400 }
    );
  }
  let slugBase = slugify(body.slug || name);
  if (!slugBase) slugBase = "workspace";

  let slug = slugBase;
  let attempt = 2;
  // Kollision vermeiden — an den Slug ein Suffix hängen falls belegt.
  while (await prisma.workspace.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${slugBase}-${attempt++}`;
    if (attempt > 50) break;
  }

  const workspace = await prisma.workspace.create({
    data: {
      name,
      slug,
      settings: { create: { businessName: name } },
    },
    select: { id: true, name: true, slug: true, createdAt: true },
  });

  return NextResponse.json({ workspace }, { status: 201 });
}
