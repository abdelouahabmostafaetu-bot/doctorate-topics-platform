import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { readStoredStream } from "@/lib/ai/stream-store";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const ownerId = session?.user?.id;
  if (!ownerId) {
    return NextResponse.json({ error: "Sign in to resume this stream." }, { status: 401 });
  }

  const { id } = await params;
  if (!/^[a-zA-Z0-9_-]{12,120}$/.test(id)) {
    return NextResponse.json({ error: "Invalid stream id." }, { status: 400 });
  }

  const snapshot = await readStoredStream(id, ownerId).catch(() => null);
  if (!snapshot) {
    return NextResponse.json({ error: "Stream not found." }, { status: 404 });
  }
  return NextResponse.json(snapshot, {
    headers: { "Cache-Control": "no-store" },
  });
}