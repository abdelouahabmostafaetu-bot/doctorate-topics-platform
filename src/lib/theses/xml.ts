// Tiny dependency-free XML helpers, good enough for OAI-PMH oai_dc.

const ENT: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, h) => {
      try {
        return String.fromCodePoint(parseInt(h, 16));
      } catch {
        return "";
      }
    })
    .replace(/&#(\d+);/g, (_m, d) => {
      try {
        return String.fromCodePoint(parseInt(d, 10));
      } catch {
        return "";
      }
    })
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_m, n) => ENT[n] ?? _m);
}

export function stripCdata(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

export function blocks(xml: string, tag: string): string[] {
  const out: string[] = [];
  const re = new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + tag + ">", "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(m[1]);
  return out;
}

export function values(xml: string, tag: string): string[] {
  return blocks(xml, tag)
    .map((v) => decodeEntities(stripCdata(v)).replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export function firstValue(xml: string, tag: string): string {
  return values(xml, tag)[0] || "";
}

export function attrOf(s: string, name: string): string {
  const m = new RegExp(name + '="([^"]*)"').exec(s);
  return m ? decodeEntities(m[1]) : "";
}

export function oaiError(xml: string): string {
  const m = /<error[^>]*code="([^"]+)"/.exec(xml);
  return m ? m[1] : "";
}

export function resumption(xml: string): { token: string; total: number } {
  const m = /<resumptionToken([^>]*)>([\s\S]*?)<\/resumptionToken>/.exec(xml);
  if (!m) return { token: "", total: 0 };
  const total = Number(attrOf(m[1], "completeListSize") || 0);
  return { token: decodeEntities(m[2]).trim(), total };
}

export function headerIsDeleted(recordXml: string): boolean {
  const m = /<header([^>]*)>/.exec(recordXml);
  return !!m && /status="deleted"/.test(m[1]);
}
