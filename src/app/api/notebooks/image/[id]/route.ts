import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/notebooks/image/:id -> serve the stored image bytes. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const img = await prisma.notebookImage.findUnique({ where: { id } });
  if (!img) return new Response("Not found", { status: 404 });

  const bytes = Buffer.from(img.data, "base64");

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": img.mime,
      "Content-Length": String(bytes.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
