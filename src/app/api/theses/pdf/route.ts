import { NextResponse, type NextRequest } from "next/server";
import { thesesCol } from "@/lib/theses/db";
import { repoByKey } from "@/lib/theses/repos";
import { UA } from "@/lib/theses/rest";
import { findPdf, handleOf, itemUuidFromHandle, uuidOf } from "@/lib/theses/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asciiName(s: string): string {
  const t = (s || "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/["\\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return (t || "thesis").slice(0, 60) + ".pdf";
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") || "";
  if (!id) return new NextResponse("missing id", { status: 400 });

  const col = await thesesCol();
  const doc = await col.findOne({ _id: id });
  if (!doc) return new NextResponse("not found", { status: 404 });

  const repo = repoByKey(doc.repo);
  if (!repo || repo.version !== 7) {
    return NextResponse.redirect(doc.landingUrl, 302);
  }

  let url = doc.pdfUrl || "";

  if (!url) {
    try {
      let uuid = doc.itemUuid || uuidOf(doc.landingUrl);
      if (!uuid) {
        const h = handleOf(doc.landingUrl);
        if (h) uuid = await itemUuidFromHandle(repo, h);
      }
      if (uuid) {
        const found = await findPdf(repo, uuid);
        if (found) {
          url = found.url;
          await col.updateOne(
            { _id: id },
            { $set: { itemUuid: uuid, pdfUrl: url, pdfAt: new Date() } }
          );
        }
      }
    } catch {
      // ignore and fall back to the university landing page
    }
  }

  if (!url) return NextResponse.redirect(doc.landingUrl, 302);

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/pdf,*/*" },
      redirect: "follow",
    });
  } catch {
    return NextResponse.redirect(doc.landingUrl, 302);
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.redirect(doc.landingUrl, 302);
  }

  const headers: Record<string, string> = {
    "Content-Type": upstream.headers.get("content-type") || "application/pdf",
    "Content-Disposition": 'inline; filename="' + asciiName(doc.title) + '"',
    "Cache-Control": "public, max-age=3600",
  };
  const len = upstream.headers.get("content-length");
  if (len) headers["Content-Length"] = len;

  return new NextResponse(upstream.body as unknown as BodyInit, {
    status: 200,
    headers,
  });
}
