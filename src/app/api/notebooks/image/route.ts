import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/notebooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB

/** POST { dataUrl } -> { id, url } : store an image inside MongoDB. */
export async function POST(req: Request) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: { dataUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const dataUrl = String(body?.dataUrl ?? "");
  const m = /^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return NextResponse.json({ error: "bad image" }, { status: 400 });

  const mime = m[1];
  const data = m[2];
  if (!mime.startsWith("image/")) {
    return NextResponse.json({ error: "not an image" }, { status: 400 });
  }
  if (Buffer.byteLength(data, "base64") > MAX_BYTES) {
    return NextResponse.json({ error: "too large" }, { status: 413 });
  }

  const img = await prisma.notebookImage.create({ data: { mime, data } });

  return NextResponse.json({ id: img.id, url: "/api/notebooks/image/" + img.id });
}
