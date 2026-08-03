// Diagnostic tool for the HTML harvester.
//
// We cannot inspect .dz pages from anywhere but this machine, so instead of
// guessing what a /handle/ page looks like, dump the facts:
//   - HTTP size and <title>
//   - which "container" markers match
//   - what totalItems() reads
//   - every /handle/ link found, with its anchor text and where it sits
//
// Usage (no build needed):
//   npx tsx scripts/probe-html.ts --url=https://di.univ-blida.dz/jspui/handle/123456789/56
//   npx tsx scripts/probe-html.ts --url=A,B,C --dump
//
// --dump also writes the raw HTML of the first URL to probe-html-raw.html.
// Output is printed and written to probe-html.txt.

import "dotenv/config";
import dns from "node:dns";
import { writeFileSync } from "node:fs";

const servers = (process.env.DNS_SERVERS || "1.1.1.1,8.8.8.8")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

try {
  dns.setServers(servers);
  console.log("dns servers -> " + dns.getServers().join(", "));
} catch (e) {
  console.warn("could not pin dns servers: " + (e instanceof Error ? e.message : String(e)));
}

const DEFAULT_URLS = [
  "https://di.univ-blida.dz/jspui/handle/123456789/56",
  "http://dspace.univ-relizane.dz/home/handle/123456789/27",
  "http://dspace.univ-adrar.edu.dz/jspui/handle/123456789/111",
];

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Anchor tags with their href and visible text. */
function anchors(html: string): Array<{ href: string; text: string }> {
  const out: Array<{ href: string; text: string }> = [];
  const re = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    out.push({ href: m[1], text: stripTags(m[2]).slice(0, 90) });
  }
  return out;
}

/** Which enclosing element a match sits in, roughly: table / ul / ol / div. */
function containerOf(html: string, index: number): string {
  const before = html.slice(0, index);
  const tags = ["table", "ul", "ol"];
  let best = "div";
  let bestPos = -1;
  for (const t of tags) {
    const open = before.lastIndexOf("<" + t);
    const close = before.lastIndexOf("</" + t);
    if (open > close && open > bestPos) {
      bestPos = open;
      best = t;
    }
  }
  if (bestPos >= 0) {
    const snippet = before.slice(bestPos, bestPos + 200);
    const cls = /class\s*=\s*["']([^"']+)["']/i.exec(snippet);
    if (cls) return best + "." + cls[1].split(/\s+/).slice(0, 2).join(".");
  }
  return best;
}

const CONTAINER_MARKERS: Array<[string, RegExp]> = [
  ["Collections in this community", /Collections?\s+in\s+this\s+community/i],
  ["Sub-communities within", /Sub-?communit(y|ies)\s+within/i],
  ["Community home page", /Community\s+home\s+page/i],
  ["Collection home page", /Collection\s+home\s+page/i],
  ["Recent Submissions", /Recent\s+Submissions/i],
  ["Browse by", /Browse\s+by/i],
  ["N to M of X", /\b\d+\s+to\s+\d+\s+of\s+\d+\b/i],
  ["showing items N-M of X", /showing\s+items?\s+\d+\s*-\s*\d+\s+of\s+\d+/i],
  ["DSpace 7 Angular (app-root)", /<app-root|ng-version=/i],
];

async function probe(url: string, lines: string[], dump: boolean) {
  const { getText } = await import("../src/lib/theses/http");
  const { totalItems, isContainerPage, itemHandles, metaTags } = await import(
    "../src/lib/theses/html"
  );

  lines.push("");
  lines.push("=".repeat(78));
  lines.push(url);
  lines.push("=".repeat(78));

  let html: string;
  try {
    html = await getText(url, {
      accept: "text/html,application/xhtml+xml,*/*",
      timeoutMs: 60000,
      tries: 2,
    });
  } catch (e) {
    lines.push("ERREUR: " + (e instanceof Error ? e.message : String(e)));
    return;
  }

  if (dump) {
    writeFileSync("probe-html-raw.html", html, "utf8");
    lines.push("(HTML brut ecrit dans probe-html-raw.html)");
  }

  const title = stripTags(/<title>([\s\S]*?)<\/title>/i.exec(html)?.[1] || "");
  lines.push("taille   : " + html.length + " o");
  lines.push("title    : " + title);
  lines.push("totalItems()      : " + String(totalItems(html)));
  lines.push("isContainerPage() : " + String(isContainerPage(html)));
  lines.push("itemHandles()     : " + itemHandles(html, "").length + " handle(s)");

  const meta = metaTags(html);
  const metaKeys = [...meta.keys()].filter((k) => /^(dc|dcterms|citation)\./.test(k));
  lines.push("meta DC/citation  : " + (metaKeys.length ? metaKeys.join(", ") : "(aucun)"));

  lines.push("");
  lines.push("-- marqueurs --");
  for (const [name, re] of CONTAINER_MARKERS) {
    lines.push("  " + (re.test(html) ? "[x] " : "[ ] ") + name);
  }

  // Every /handle/ link on the page, with context.
  const links = anchors(html).filter((a) => /\/handle\/\d+\/\d+/.test(a.href));
  lines.push("");
  lines.push("-- liens /handle/ : " + links.length + " --");
  const shown = links.slice(0, 60);
  for (const l of shown) {
    const idx = html.indexOf(l.href);
    const where = idx >= 0 ? containerOf(html, idx) : "?";
    lines.push("  [" + where + "] " + l.href + "   <- " + (l.text || "(sans texte)"));
  }
  if (links.length > shown.length) {
    lines.push("  ... et " + (links.length - shown.length) + " autres");
  }

  // What the page looks like once tags are gone: useful to spot an SPA shell
  // or an "empty collection" message.
  lines.push("");
  lines.push("-- texte (600 premiers caracteres) --");
  lines.push("  " + stripTags(html).slice(0, 600));
}

async function main() {
  const urlArg = process.argv.find((a) => a.startsWith("--url="));
  const dump = process.argv.includes("--dump");
  const urls = urlArg
    ? urlArg
        .slice("--url=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : DEFAULT_URLS;

  const lines: string[] = [
    "# probe-html.txt - " + new Date().toISOString(),
    "# DNS: " + dns.getServers().join(", "),
  ];

  for (const u of urls) {
    await probe(u, lines, dump && u === urls[0]);
  }

  const text = lines.join("\n");
  writeFileSync("probe-html.txt", text, "utf8");
  console.log(text);
  console.log("");
  console.log("-> probe-html.txt");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
