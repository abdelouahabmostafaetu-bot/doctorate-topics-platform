import { NextResponse, type NextRequest } from "next/server";
import { thesesCol } from "@/lib/theses/db";
import { repoByKey } from "@/lib/theses/repos";
import { UA } from "@/lib/theses/rest";
import {
  findPdf,
  findPdfInPage,
  handleOf,
  itemUuidFromHandle,
  uuidOf,
} from "@/lib/theses/pdf";

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
  const repo = repoByKey(doc.repo);

  const remember = async (url: string, uuid?: string) => {
    const set: Record<string, unknown> = { pdfUrl: url, pdfAt: new Date() };
    if (uuid) set.itemUuid = uuid;
    await col.updateOne({ _id: id }, { $set: set });
  };

  // 1) URL deja connue : moissonneur national (miroir bucket ou bitstream
  //    DSpace 7 direct), ou resolution memorisee lors d'un appel precedent.
  let url = doc.pdfUrl || "";

  // 2) Depot DSpace 7 : resolution par l'API REST.
  if (!url && repo && repo.version === 7) {
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
          await remember(url, uuid);
        }
      }
    } catch {
      // on tentera la page HTML
    }
  }

  // 3) Tout le reste (Adrar, Ouargla, Blida, Biskra, Mila, EPrints...) :
  //    on lit la page de l'item et on y prend le lien /bitstream/....pdf
  if (!url && landing) {
    try {
      const found = await findPdfInPage(landing);
      if (found) {
        url = found;
        await remember(url);
      }
    } catch {
      // ignore : on retombe sur la page de la bibliotheque
    }
  }

  const fallback = () =>
    landing
      ? NextResponse.redirect(landing, 302)
      : new NextResponse("no pdf", { status: 404 });

  if (!url) return fallback();

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

  // Un lien perime renvoie souvent une page HTML avec un statut 200 :
  // ne jamais la servir comme un PDF, et oublier l'URL pour la re-resoudre
  // au prochain appel.
  const ctype = upstream.headers.get("content-type") || "";
  if (/text\/html|application\/xhtml/i.test(ctype)) {
    try {
      await upstream.body.cancel();
    } catch {
      // ignore
    }
    if (doc.pdfUrl) {
      await col.updateOne({ _id: id }, { $unset: { pdfUrl: "", pdfAt: "" } });
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
