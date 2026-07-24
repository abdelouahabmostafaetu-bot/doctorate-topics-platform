// Image upload for My Notes — SUPER_ADMIN only
// Images are compressed in the browser, then stored as base64 in the
// mylibrary MongoDB (collection "noteimages") — no external service needed.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMylibraryDb } from "@/lib/mylibrary";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let dataUrl: unknown;
  try {
    ({ dataUrl } = (await req.json()) as { dataUrl?: unknown });
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (typeof dataUrl !== "string") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const m = dataUrl.match(/^data:(image\/[a-z0-9+.-]+);base64,(.+)$/i);
  if (!m) {
    return NextResponse.json({ error: "Not an image data URL" }, { status: 400 });
  }
  // ~3 MB of base64 max (browser already compresses before upload)
  if (m[2].length > 4_000_000) {
    return NextResponse.json({ error: "Image too large" }, { status: 413 });
  }

  const db = await getMylibraryDb();
  const res = await db.collection("noteimages").insertOne({
    mime: m[1],
    data: m[2],
    createdAt: new Date(),
  });

  return NextResponse.json({ id: String(res.insertedId) });
}
