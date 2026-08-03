// Resolution du PDF d'un document, par deux voies :
//  1. DSpace 7 REST : items/{uuid}/bundles -> ORIGINAL -> bitstreams -> _links.content
//  2. N'importe quel depot (DSpace 1.x a 6 en JSPUI/XMLUI, EPrints...) : on lit la
//     page de l'item et on y cherche le lien /bitstream/....pdf.

import { arr, fetchJson, obj, restBase, str } from "./rest";
import { decodeEntities } from "./html";
import { getText } from "./http";
import type { RepoDef } from "./repos";

export type PdfRef = { url: string; name: string; size: number };

export function handleOf(landingUrl: string): string {
  const m = /\/handle\/([^?#]+)/.exec(landingUrl || "");
  return m ? m[1].replace(/\/+$/, "") : "";
}

export function uuidOf(landingUrl: string): string {
  const m = /\/items\/([0-9a-fA-F-]{36})/.exec(landingUrl || "");
  return m ? m[1] : "";
}

export async function itemUuidFromHandle(
  repo: RepoDef,
  handle: string
): Promise<string> {
  const j = obj(
    await fetchJson(
      restBase(repo) + "/pid/find?id=" + encodeURIComponent("hdl:" + handle),
      2
    )
  );
  return str(j.uuid) || str(j.id);
}

export async function findPdf(
  repo: RepoDef,
  uuid: string
): Promise<PdfRef | null> {
  const base = restBase(repo);

  const b = obj(await fetchJson(base + "/core/items/" + uuid + "/bundles?size=20", 2));
  const bundles = arr(obj(b._embedded).bundles).map(obj);
  if (!bundles.length) return null;

  const bundle =
    bundles.find((x) => str(x.name).toUpperCase() === "ORIGINAL") || bundles[0];

  let listUrl = str(obj(obj(bundle._links).bitstreams).href);
  if (!listUrl) {
    const bu = str(bundle.uuid) || str(bundle.id);
    if (!bu) return null;
    listUrl = base + "/core/bundles/" + bu + "/bitstreams";
  }
  listUrl += (listUrl.includes("?") ? "&" : "?") + "size=50";

  const l = obj(await fetchJson(listUrl, 2));
  const bits = arr(obj(l._embedded).bitstreams).map(obj);
  if (!bits.length) return null;

  const pdf = bits.find((x) => /\.pdf$/i.test(str(x.name))) || bits[0];
  const content = str(obj(obj(pdf._links).content).href);
  if (!content) return null;

  return {
    url: content,
    name: str(pdf.name) || "thesis.pdf",
    size: Number(pdf.sizeBytes || 0),
  };
}

// ---------------------------------------------------------------------------
// Voie 2 : lecture de la page HTML de l'item.
// Exemple observe (Adrar, DSpace 6 JSPUI) :
//   page  https://dspace.univ-adrar.edu.dz/jspui/handle/123456789/9285
//   fichier .../jspui/bitstream/123456789/9285/1/Contribution to the study....pdf
// ---------------------------------------------------------------------------

/** Fichiers annexes a ne jamais servir comme document principal. */
const JUNK =
  /(licen[cs]e|avis|logo|banner|thumbnail|couverture[-_ ]?vide)[^/]*\.pdf$/i;

export function absolutize(base: string, href: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return "";
  }
}

/** Tous les liens de fichier plausibles d'une page d'item, les meilleurs d'abord. */
export function pdfLinksIn(html: string, base: string): string[] {
  const found: Array<{ url: string; rank: number }> = [];
  const re = /href\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;

  while ((m = re.exec(html))) {
    const raw = decodeEntities(m[1]).trim();
    if (!raw || raw.startsWith("#") || /^(javascript|mailto):/i.test(raw)) continue;

    const noHash = raw.split("#")[0];
    const path = noHash.split("?")[0];

    const isBitstream = /\/bitstreams?\//i.test(noHash);
    const isPdf = /\.pdf$/i.test(path);
    // DSpace 7 : /server/api/core/bitstreams/<uuid>/content
    const isContent = isBitstream && /\/content$/i.test(path);

    if (!isPdf && !isContent) continue;
    if (JUNK.test(path)) continue;

    const url = absolutize(base, noHash);
    if (!url) continue;

    // On privilegie un vrai bitstream .pdf, puis /content, puis tout autre .pdf.
    const rank = isBitstream && isPdf ? 0 : isContent ? 1 : 2;
    found.push({ url, rank });
  }

  const seen = new Set<string>();
  return found
    .sort((a, b) => a.rank - b.rank)
    .map((x) => x.url)
    .filter((u) => (seen.has(u) ? false : (seen.add(u), true)));
}

/**
 * Cherche le PDF directement dans la page de l'item.
 * Fonctionne pour JSPUI, XMLUI et EPrints, donc pour les depots DSpace 1.x a 6
 * (Adrar, Ouargla, Blida, Biskra, Mila...) qui n'ont pas d'API REST exploitable.
 */
export async function findPdfInPage(landingUrl: string): Promise<string> {
  if (!landingUrl) return "";
  const html = await getText(landingUrl, {
    accept: "text/html,application/xhtml+xml,*/*",
    timeoutMs: 30000,
    tries: 2,
  });
  const links = pdfLinksIn(html, landingUrl);
  return links[0] || "";
}
