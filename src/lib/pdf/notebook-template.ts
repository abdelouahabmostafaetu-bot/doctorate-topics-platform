// =====================================================================
//  Notebook PDF template - same visual identity as the exams PDF
// =====================================================================

import { renderMathHtml, escapeHtml } from "./render-content";

const SITE_ORIGIN =
  (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "") || "https://www.docmathdz.dev";

const COVER_IMAGE = SITE_ORIGIN + "/images/pdf-cover.png";
const BACK_IMAGE = SITE_ORIGIN + "/images/pdf-back.png";

export type PdfNotebookPage = {
  number: number;
  title?: string | null;
  content: string;
};

export type PdfNotebook = {
  title: string;
  subtitle?: string | null;
  color?: string | null;
};

type BoxMeta = { label: string; color: string; bg: string };

const BOX_META: Record<string, BoxMeta> = {
  def: { label: "\u062a\u0639\u0631\u064a\u0641", color: "#2f6fdb", bg: "#eef4ff" },
  thm: { label: "\u0646\u0638\u0631\u064a\u0629", color: "#1d4ed8", bg: "#eef2ff" },
  proof: { label: "\u0628\u0631\u0647\u0627\u0646", color: "#475569", bg: "#f4f6f9" },
  imp: { label: "\u0646\u0642\u0637\u0629 \u0645\u0647\u0645\u0629", color: "#d63b47", bg: "#fff0f1" },
  idea: { label: "\u0641\u0643\u0631\u0629", color: "#cf8420", bg: "#fff8ec" },
  ex: { label: "\u062a\u0645\u0631\u064a\u0646", color: "#7c56d6", bg: "#f6f2ff" },
  exemple: { label: "\u0645\u062b\u0627\u0644", color: "#0e7490", bg: "#ecfeff" },
  sum: { label: "\u062e\u0644\u0627\u0635\u0629", color: "#10917a", bg: "#ecfdf6" },
  warn: { label: "\u062a\u0646\u0628\u064a\u0647", color: "#d97706", bg: "#fff7ed" },
};

const OPEN_RE = /^:::(def|thm|proof|imp|idea|ex|exemple|sum|warn)[ \t]*(.*)$/;
const CLOSE_RE = /^:::[ \t]*$/;
const SOLUTION_RE = /^@@(?:solution|\u062d\u0644)[ \t]*$/m;

/** Convert one page body (markdown + boxes) into print-ready HTML. */
function renderBody(src: string): string {
  const lines = String(src ?? "").split("\n");
  const out: string[] = [];
  let buf: string[] = [];

  const flush = () => {
    const text = buf.join("\n");
    if (text.trim()) out.push(renderMathHtml(text));
    buf = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const m = OPEN_RE.exec(lines[i]);
    if (!m) {
      buf.push(lines[i]);
      continue;
    }
    flush();
    const kind = m[1];
    const title = (m[2] || "").trim();
    const body: string[] = [];
    i++;
    while (i < lines.length && !CLOSE_RE.test(lines[i])) {
      body.push(lines[i]);
      i++;
    }

    const meta = BOX_META[kind] || BOX_META.def;
    const raw = body.join("\n");
    let inner: string;

    if (kind === "ex" && SOLUTION_RE.test(raw)) {
      const parts = raw.split(SOLUTION_RE);
      const statement = parts[0] ?? "";
      const solution = parts.slice(1).join("\n").trim();
      inner =
        renderMathHtml(statement) +
        '<div class="nbp-solution"><div class="nbp-solution-head">\u0627\u0644\u062d\u0644</div>' +
        renderMathHtml(solution) +
        "</div>";
    } else {
      inner = renderMathHtml(raw);
    }

    out.push(
      '<div class="nbp-box" style="border-color:' +
        meta.color +
        ";background:" +
        meta.bg +
        '">' +
        '<div class="nbp-box-head" style="color:' +
        meta.color +
        '">' +
        escapeHtml(title || meta.label) +
        "</div>" +
        '<div class="nbp-box-body">' +
        inner +
        "</div></div>"
    );
  }
  flush();
  return out.join("\n");
}

function frontCover(nb: PdfNotebook, pageCount: number): string {
  return (
    '<section class="cover">' +
    '<img class="cover-img" src="' +
    COVER_IMAGE +
    '" alt="" />' +
    '<div class="cover-overlay">' +
    '<div class="cover-kicker">\u0643\u0631\u0651\u0627\u0633 \u062f\u0631\u0627\u0633\u064a</div>' +
    '<h1 class="cover-title">' +
    escapeHtml(nb.title) +
    "</h1>" +
    (nb.subtitle
      ? '<div class="cover-sub">' + escapeHtml(nb.subtitle) + "</div>"
      : "") +
    '<div class="cover-rule"></div>' +
    '<div class="cover-meta">' +
    pageCount +
    " \u0635\u0641\u062d\u0629 \u00b7 " +
    new Date().toLocaleDateString("fr-FR") +
    "</div>" +
    "</div></section>"
  );
}

function thanksAndToc(pages: PdfNotebookPage[]): string {
  const items = pages
    .map(
      (p) =>
        '<div class="toc-item"><span class="toc-label">' +
        escapeHtml(p.title || "\u0635\u0641\u062d\u0629 " + p.number) +
        '</span><span class="toc-dots"></span><span class="toc-page">' +
        p.number +
        "</span></div>"
    )
    .join("");

  return (
    '<section class="sheet thanks">' +
    '<div class="basmala">\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064e\u0647\u0650 \u0627\u0644\u0631\u064e\u0651\u062d\u0652\u0645\u064e\u0640\u0670\u0646\u0650 \u0627\u0644\u0631\u064e\u0651\u062d\u0650\u064a\u0645\u0650</div>' +
    '<h2 class="thanks-title">\u0634\u0643\u0631 \u0648\u062a\u0642\u062f\u064a\u0631</h2>' +
    '<p class="thanks-text">\u0647\u0630\u0627 \u0627\u0644\u0643\u0631\u0651\u0627\u0633 \u0645\u0646 \u0625\u0639\u062f\u0627\u062f \u0645\u0646\u0635\u0629 \u0645\u0648\u0627\u0636\u064a\u0639 \u0627\u0644\u062f\u0643\u062a\u0648\u0631\u0627\u0647\u060c \u0648\u0647\u0648 \u0639\u0645\u0644 \u0634\u062e\u0635\u064a \u0644\u0644\u0645\u0631\u0627\u062c\u0639\u0629 \u0648\u0627\u0644\u062f\u0631\u0627\u0633\u0629.</p>' +
    '<div class="toc"><h3 class="toc-title">\u0627\u0644\u0641\u0647\u0631\u0633</h3>' +
    items +
    "</div></section>"
  );
}

function pageSection(p: PdfNotebookPage): string {
  return (
    '<section class="sheet page-sheet">' +
    '<div class="page-head">' +
    '<span class="page-num">\u0635\u0641\u062d\u0629 ' +
    p.number +
    "</span>" +
    (p.title ? '<span class="page-title">' + escapeHtml(p.title) + "</span>" : "") +
    "</div>" +
    '<div class="page-body">' +
    renderBody(p.content) +
    "</div></section>"
  );
}

function backCover(): string {
  return (
    '<section class="cover"><img class="cover-img" src="' + BACK_IMAGE + '" alt="" /></section>'
  );
}

export function buildNotebookHtml(
  notebook: PdfNotebook,
  pages: PdfNotebookPage[],
  opts: { toc?: boolean } = {}
): string {
  const withToc = opts.toc !== false;

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(notebook.title)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css" />
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "STIX Two Text", "Amiri", "Noto Naskh Arabic", serif;
    color: #1b2333;
    direction: rtl;
  }
  .cover { position: relative; width: 210mm; height: 297mm; page-break-after: always; overflow: hidden; }
  .cover-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .cover-overlay {
    position: absolute; inset: 0; display: flex; flex-direction: column;
    align-items: center; justify-content: center; text-align: center; padding: 0 22mm;
  }
  .cover-kicker { color: #d4af37; letter-spacing: .18em; font-size: 12pt; margin-bottom: 6mm; }
  .cover-title { color: #ffffff; font-size: 30pt; line-height: 1.35; margin: 0; text-shadow: 0 2px 12px rgba(0,0,0,.45); }
  .cover-sub { color: #e8eef8; font-size: 14pt; margin-top: 4mm; }
  .cover-rule { width: 46mm; height: 2px; background: #d4af37; margin: 8mm auto; }
  .cover-meta { color: #dfe7f3; font-size: 11pt; }

  .sheet { width: 210mm; min-height: 297mm; padding: 22mm 18mm 20mm; page-break-after: always; }
  .thanks { text-align: center; }
  .basmala { color: #163a70; font-size: 16pt; margin-bottom: 10mm; }
  .thanks-title { color: #163a70; font-size: 20pt; margin: 0 0 4mm; }
  .thanks-text { color: #3d4a60; font-size: 12pt; line-height: 1.9; max-width: 140mm; margin: 0 auto 12mm; }

  .toc { text-align: right; border-top: 2px solid #d4af37; padding-top: 8mm; }
  .toc-title { color: #163a70; font-size: 16pt; margin: 0 0 6mm; }
  .toc-item { display: flex; align-items: baseline; gap: 3mm; font-size: 12pt; margin-bottom: 3mm; }
  .toc-dots { flex: 1; border-bottom: 1px dotted #b9c3d4; transform: translateY(-3px); }
  .toc-page { color: #163a70; font-weight: 700; }

  .page-head {
    display: flex; align-items: baseline; gap: 4mm;
    border-bottom: 2px solid #163a70; padding-bottom: 3mm; margin-bottom: 7mm;
  }
  .page-num { background: #163a70; color: #fff; font-size: 10pt; padding: 1.5mm 4mm; border-radius: 3mm; }
  .page-title { color: #163a70; font-size: 15pt; font-weight: 700; }

  .page-body { font-size: 12pt; line-height: 1.95; }
  .page-body h1, .page-body h2, .page-body h3 { color: #163a70; margin: 6mm 0 3mm; }
  .page-body h1 { font-size: 17pt; }
  .page-body h2 { font-size: 15pt; }
  .page-body h3 { font-size: 13pt; }
  .page-body p { margin: 0 0 3.5mm; }
  .page-body ul, .page-body ol { margin: 0 0 4mm; padding-right: 7mm; }
  .page-body li { margin-bottom: 1.5mm; }
  .page-body img { max-width: 100%; border-radius: 2mm; margin: 3mm 0; }
  .page-body table { width: 100%; border-collapse: collapse; margin: 4mm 0; font-size: 11pt; }
  .page-body th, .page-body td { border: 1px solid #cfd8e6; padding: 2mm 3mm; text-align: right; }
  .page-body th { background: #eef2f8; color: #163a70; }
  .page-body code { background: #f1f4f9; padding: .5mm 1.5mm; border-radius: 1mm; font-size: 10.5pt; }
  .page-body pre { background: #f6f8fc; border: 1px solid #dde4ef; padding: 3mm; border-radius: 2mm; overflow: hidden; direction: ltr; text-align: left; }
  .page-body blockquote { border-right: 3px solid #d4af37; margin: 0 0 4mm; padding: 1mm 5mm; color: #47536b; }
  .page-body mark { background: #fff2a8; padding: 0 1mm; }

  .nbp-box { border-right: 4px solid; border-radius: 2.5mm; padding: 4mm 5mm; margin: 5mm 0; page-break-inside: avoid; }
  .nbp-box-head { font-weight: 700; font-size: 12pt; margin-bottom: 2mm; }
  .nbp-box-body p:last-child { margin-bottom: 0; }
  .nbp-solution { margin-top: 3mm; border-top: 1px dashed #b9c3d4; padding-top: 2.5mm; }
  .nbp-solution-head { color: #7c56d6; font-weight: 700; margin-bottom: 1.5mm; }

  .katex { font-size: 1.03em; }
  .katex-display { margin: 3mm 0; }
</style>
</head>
<body>
${frontCover(notebook, pages.length)}
${withToc ? thanksAndToc(pages) : ""}
${pages.map(pageSection).join("\n")}
${backCover()}
</body>
</html>`;
}
