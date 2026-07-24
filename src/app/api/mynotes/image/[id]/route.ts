// Serves My Notes images from MongoDB — SUPER_ADMIN only
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getMylibraryDb } from "@/lib/mylibrary";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await params;
  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const db = await getMylibraryDb();
  const doc = await db.collection("noteimages").findOne({ _id: oid });
  if (!doc || typeof doc.data !== "string") {
    return new Response("Not found", { status: 404 });
  }

  return new Response(Buffer.from(doc.data, "base64"), {
    headers: {
      "Content-Type": typeof doc.mime === "string" ? doc.mime : "image/webp",
      // Images never change once uploaded — cache aggressively (per user)
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
