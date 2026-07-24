import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/notebooks";
import { buildNotebookHtml } from "@/lib/pdf/notebook-template";
import { renderPdf } from "@/lib/pdf/generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function safeName(s: string): string {
  return (
    String(s || "notebook")
      .replace(/[\\/:*?"<>|]+/g, " ")
      .replace(/\s+/g, "-")
      .slice(0, 60) || "notebook"
  );
}

/** GET /api/notebooks/:id/pdf?pages=1,3,5&toc=1 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const url = new URL(req.url);

  const nb = await prisma.notebook.findUnique({
    where: { id },
    include: { pages: { orderBy: { number: "asc" } } },
  });
  if (!nb) return new Response("Not found", { status: 404 });

  const wanted = (url.searchParams.get("pages") || "")
    .split(",")
    .map((n) => parseInt(n.trim(), 10))
    .filter((n) => Number.isFinite(n));

  const selected =
    wanted.length > 0 ? nb.pages.filter((p) => wanted.includes(p.number)) : nb.pages;

  if (selected.length === 0) {
    return new Response("No pages", { status: 400 });
  }

  const html = buildNotebookHtml(
    { title: nb.title, subtitle: nb.subtitle, color: nb.color },
    selected.map((p) => ({ number: p.number, title: p.title, content: p.content })),
    { toc: url.searchParams.get("toc") !== "0" }
  );

  const pdf = await renderPdf(html);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        'attachment; filename="' + safeName(nb.title) + '.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
