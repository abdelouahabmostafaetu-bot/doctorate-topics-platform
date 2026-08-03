// Diagnostic de la chaine de telechargement PDF, etape par etape.
//
//   npx tsx scripts/probe-pdf.ts --repo=adrar --n=3 --dump
//   npx tsx scripts/probe-pdf.ts --url="http://dspace.univ-adrar.edu.dz/jspui/handle/123456789/9285"
//   npx tsx scripts/probe-pdf.ts --url="http://.../bitstream/123456789/9285/1/Contribution....pdf"
//
// Repond a trois questions, dans l'ordre :
//   1. la page de l'item est-elle lisible depuis cette machine ?
//   2. y trouve-t-on le lien du fichier ?
//   3. le serveur rend-il vraiment des octets PDF (et pas une page HTML) ?

import "dotenv/config";
import dns from "node:dns";
import { writeFileSync } from "node:fs";

dns.setServers(
  (process.env.DNS_SERVERS || "1.1.1.1,8.8.8.8")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

const out: string[] = [];
function log(s = "") {
  console.log(s);
  out.push(s);
}

function flag(name: string): string {
  const p = process.argv.find((a) => a.startsWith("--" + name + "="));
  return p ? p.slice(name.length + 3) : "";
}
function has(name: string): boolean {
  return process.argv.includes("--" + name);
}

// Un vrai navigateur : certains Tomcat/WAF refusent les agents inconnus.
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const TIMEOUT = Number(flag("timeout") || 45000);

function looksLikeFile(u: string): boolean {
  const path = u.split("#")[0].split("?")[0];
  return /\.pdf$/i.test(path) || /\/content$/i.test(path);
}

async function fetchText(
  url: string
): Promise<{ status: number; text: string; err?: string }> {
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,*/*",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT),
    });
    return { status: r.status, text: await r.text() };
  } catch (e) {
    return { status: 0, text: "", err: String((e as Error)?.message || e) };
  }
}

async function head(
  url: string,
  referer: string
): Promise<string> {
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "application/pdf,*/*",
        Range: "bytes=0-4095",
        ...(referer ? { Referer: referer } : {}),
      },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT),
    });
    const buf = new Uint8Array(await r.arrayBuffer());
    const magic = new TextDecoder("latin1").decode(buf.slice(0, 5));
    const ctype = r.headers.get("content-type") || "-";
    const len = r.headers.get("content-length") || "-";
    const verdict =
      magic === "%PDF-"
        ? "OK PDF"
        : /html/i.test(ctype)
          ? "!! page HTML, pas un PDF"
          : "?? debut inattendu";
    return (
      "status=" +
      r.status +
      "  final=" +
      (r.url !== url ? r.url : "(pas de redirection)") +
      "\n      ctype=" +
      ctype +
      "  len=" +
      len +
      "  lus=" +
      buf.length +
      "o  magic=" +
      JSON.stringify(magic) +
      "  -> " +
      verdict
    );
  } catch (e) {
    return "ECHEC " + String((e as Error)?.message || e);
  }
}

async function probeItem(landing: string, known: string) {
  log("");
  log("== " + landing);
  if (known) log("   pdfUrl deja en base : " + known);

  // Cas 1 : on nous donne directement un fichier.
  if (looksLikeFile(landing)) {
    log("   (lien de fichier, test direct)");
    log("   -> " + (await head(landing, "")));
    return;
  }

  // Cas 2 : page d'item -> extraction -> test des candidats.
  const { pdfLinksIn } = await import("../src/lib/theses/pdf");

  const page = await fetchText(landing);
  if (page.err) {
    log("   1) page      ECHEC " + page.err);
    return;
  }
  log("   1) page      status=" + page.status + "  taille=" + page.text.length + " o");
  if (page.status !== 200 || !page.text) return;

  const links = pdfLinksIn(page.text, landing);
  log("   2) candidats " + links.length);
  links.slice(0, 8).forEach((u, i) => log("      [" + i + "] " + u));

  if (!links.length) {
    const anyPdf = /href\s*=\s*["'][^"']*\.pdf[^"']*["']/gi.test(page.text);
    const anyBits = /\/bitstreams?\//i.test(page.text);
    log(
      "      aucun candidat. .pdf dans la page: " +
        anyPdf +
        " | /bitstream/ dans la page: " +
        anyBits
    );
    if (has("dump")) {
      writeFileSync("probe-pdf-raw.html", page.text, "utf8");
      log("      page brute -> probe-pdf-raw.html");
    }
    return;
  }

  for (const u of links.slice(0, 2)) {
    log("   3) fichier   " + u);
    log("      " + (await head(u, landing)));
  }
}

async function main() {
  const urls = flag("url")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const targets: Array<{ landing: string; known: string }> = [];

  if (urls.length) {
    for (const u of urls) targets.push({ landing: u, known: "" });
  } else {
    const repo = flag("repo") || "adrar";
    const n = Number(flag("n") || 3);
    const { thesesCol } = await import("../src/lib/theses/db");
    const col = await thesesCol();
    const rows = await col
      .find({ repo, status: "ok" })
      .limit(Math.max(1, n))
      .toArray();
    log("depot " + repo + " -> " + rows.length + " document(s) echantillonnes");
    for (const r of rows) {
      log("   _id=" + r._id);
      targets.push({ landing: r.landingUrl || "", known: r.pdfUrl || "" });
    }
  }

  for (const t of targets) {
    if (t.landing) await probeItem(t.landing, t.known);
  }

  if (has("dump")) {
    writeFileSync("probe-pdf.txt", out.join("\n"), "utf8");
    log("");
    log("-> probe-pdf.txt");
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
