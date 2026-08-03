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

  const landing = doc.landingUrl || "";

  // 1) URL deja connue : moissonneur national (miroir bucket ou bitstream
  //    DSpace 7 direct), ou resolution memorisee lors d'un appel precedent.
  let url = doc.pdfUrl || "";

  // 2) Sinon, resolution paresseuse via l'API REST DSpace 7 du depot.
  if (!url) {
    const repo = repoByKey(doc.repo);
    if (repo && repo.version === 7) {
      try {
        let uuid = doc.itemUuid || uuidOf(landing);
        if (!uuid) {
          const h = handleOf(landing);
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
  }

  if (!url) {
    if (!landing) return new NextResponse("no pdf", { status: 404 });
    return NextResponse.redirect(landing, 302);
  }

  const fallback = () =>
    landing
      ? NextResponse.redirect(landing, 302)
      : new NextResponse("no pdf", { status: 404 });

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/pdf,*/*",
        // certains depots refusent les requetes sans Referer
        ...(landing ? { Referer: landing } : {}),
      },
      redirect: "follow",
      signal: AbortSignal.timeout(60000),
    });
  } catch {
    return fallback();
  }

  if (!upstream.ok || !upstream.body) return fallback();

  // Un lien mort renvoie souvent une page HTML avec un statut 200 :
  // ne jamais la servir comme un PDF.
  const ctype = upstream.headers.get("content-type") || "";
  if (/text\/html|application\/xhtml/i.test(ctype)) {
    try {
      await upstream.body.cancel();
    } catch {
      // ignore
    }
    return fallback();
  }

  const headers: Record<string, string> = {
    "Content-Type": ctype || "application/pdf",
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
