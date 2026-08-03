// Resolve the direct PDF (bitstream) URL of a DSpace 7 item.
// items/{uuid}/bundles -> ORIGINAL bundle -> bitstreams -> _links.content

import { arr, fetchJson, obj, restBase, str } from "./rest";
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
      restBase(repo) + "/pid/find?id=hdl:" + encodeURIComponent(handle),
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
