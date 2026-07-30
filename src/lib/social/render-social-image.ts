import { existsSync } from "node:fs";
import katex from "katex";

export type SocialImageInput = {
  kind: "quote" | "problem";
  date: string;
  quote?: { text: string; author?: string };
  problem?: {
    subject: string;
    source?: string;
    difficulty?: 1 | 2 | 3;
    statement: string;
  };
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function renderMath(tex: string, displayMode: boolean) {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      strict: "ignore",
      trust: false,
      output: "mathml",
      macros: {
        "\\R": "\\mathbb{R}",
        "\\N": "\\mathbb{N}",
        "\\Z": "\\mathbb{Z}",
        "\\Q": "\\mathbb{Q}",
        "\\C": "\\mathbb{C}",
      },
    });
  } catch {
    return `<code>${escapeHtml(tex)}</code>`;
  }
}

function renderMixed(source: string) {
  const parts = source.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$)/g);
  return parts
    .map((part) => {
      if (!part) return "";
      if (part.startsWith("$$") && part.endsWith("$$")) {
        return `<div class="display-math">${renderMath(part.slice(2, -2), true)}</div>`;
      }
      if (part.startsWith("$") && part.endsWith("$")) {
        return renderMath(part.slice(1, -1), false);
      }
      return escapeHtml(part).replace(/\n/g, "<br />");
    })
    .join("");
}

function prettyDate(date: string) {
  try {
    return new Intl.DateTimeFormat("ar-DZ", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Africa/Algiers",
    }).format(new Date(`${date}T12:00:00+01:00`));
  } catch {
    return date;
  }
}

function fontSizeFor(text: string, kind: "quote" | "problem") {
  const length = text.length;
  if (kind === "quote") {
    if (length > 420) return 36;
    if (length > 260) return 43;
    if (length > 140) return 50;
    return 58;
  }
  if (length > 900) return 27;
  if (length > 650) return 31;
  if (length > 420) return 35;
  if (length > 230) return 41;
  return 47;
}

function buildHtml(input: SocialImageInput) {
  const isQuote = input.kind === "quote";
  const rawText = isQuote
    ? input.quote?.text?.trim() || "اكتب مقولة اليوم"
    : input.problem?.statement?.trim() || "Write the problem statement here.";
  const body = isQuote ? escapeHtml(rawText).replace(/\n/g, "<br />") : renderMixed(rawText);
  const size = fontSizeFor(rawText, input.kind);
  const difficulty = "★".repeat(input.problem?.difficulty ?? 2) + "☆".repeat(3 - (input.problem?.difficulty ?? 2));
  const logo = renderMath("\\partial", false);

  return `<!doctype html>
<html lang="${isQuote ? "ar" : "en"}" dir="${isQuote ? "rtl" : "ltr"}">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; width: 1080px; height: 1080px; overflow: hidden; }
  body {
    font-family: Arial, "Noto Sans Arabic", Tahoma, sans-serif;
    color: #fff;
    background:
      radial-gradient(circle at 88% 6%, rgba(212,175,55,.22), transparent 28%),
      radial-gradient(circle at 4% 96%, rgba(60,145,230,.22), transparent 32%),
      linear-gradient(145deg, #0d294f 0%, #163a70 52%, #245e9b 100%);
  }
  .frame { position: relative; width: 100%; height: 100%; padding: 74px 82px 68px; display: flex; flex-direction: column; }
  .frame::before { content: ""; position: absolute; inset: 34px; border: 2px solid rgba(212,175,55,.42); border-radius: 30px; pointer-events: none; }
  .top { display: flex; align-items: center; justify-content: space-between; direction: ltr; }
  .brand { display: flex; align-items: center; gap: 18px; }
  .mark { width: 100px; height: 100px; display: grid; place-items: center; border-radius: 50%; background: #fff; border: 5px solid #d4af37; color: #12345f; box-shadow: 0 12px 34px rgba(0,0,0,.18); overflow: hidden; }
  .mark math { font-size: 75px; }
  .brand-name { font-size: 30px; font-weight: 800; color: #d4af37; letter-spacing: .02em; }
  .brand-sub { margin-top: 4px; font-size: 20px; color: rgba(255,255,255,.78); }
  .badge { border: 1px solid rgba(212,175,55,.75); border-radius: 999px; padding: 12px 22px; font-size: 22px; font-weight: 700; color: #f4d66d; background: rgba(4,21,44,.25); }
  .line { height: 3px; margin: 28px 0 0; background: linear-gradient(90deg, #d4af37, rgba(212,175,55,.08)); }
  .content { flex: 1; display: flex; flex-direction: column; justify-content: center; min-height: 0; padding: 34px 24px 24px; }
  .quote-mark { font-family: Georgia, serif; color: #d4af37; font-size: 110px; line-height: .45; opacity: .92; }
  .main { font-size: ${size}px; line-height: 1.65; font-weight: 650; text-align: ${isQuote ? "center" : "left"}; direction: ${isQuote ? "rtl" : "ltr"}; overflow-wrap: anywhere; }
  .main p { margin: 0; }
  .main math { font-family: "Cambria Math", "STIX Two Math", serif; font-size: 1.08em; direction: ltr; }
  .display-math { direction: ltr; text-align: center; margin: 18px 0; }
  .author { margin-top: 34px; text-align: center; color: #f4d66d; font-size: 29px; font-weight: 700; }
  .meta { display: flex; gap: 16px; align-items: center; margin-bottom: 24px; direction: ltr; color: #f4d66d; font-size: 24px; font-weight: 700; }
  .meta .source { margin-left: auto; color: rgba(255,255,255,.72); font-size: 20px; font-weight: 500; }
  .footer { display: flex; align-items: center; justify-content: space-between; direction: ltr; border-top: 1px solid rgba(255,255,255,.18); padding-top: 22px; color: rgba(255,255,255,.82); font-size: 22px; }
  .site { font-weight: 700; color: #fff; }
  .date { direction: rtl; }
</style>
</head>
<body>
  <main class="frame">
    <header class="top">
      <div class="brand">
        <div class="mark">${logo}</div>
        <div><div class="brand-name">DocMath DZ</div><div class="brand-sub">منصة دكتوراه الرياضيات</div></div>
      </div>
      <div class="badge">${isQuote ? "✨ مقولة اليوم" : "🧮 مسألة اليوم"}</div>
    </header>
    <div class="line"></div>
    <section class="content">
      ${isQuote ? `<div class="quote-mark">“</div>` : `<div class="meta"><span>${escapeHtml(input.problem?.subject || "Mathematics")}</span><span>${difficulty}</span><span class="source">${escapeHtml(input.problem?.source || "DocMath DZ")}</span></div>`}
      <div class="main">${body}</div>
      ${isQuote && input.quote?.author ? `<div class="author">— ${escapeHtml(input.quote.author)}</div>` : ""}
    </section>
    <footer class="footer"><span class="site">www.docmathdz.dev</span><span class="date">${escapeHtml(prettyDate(input.date))}</span></footer>
  </main>
</body>
</html>`;
}

function guessLocalChrome() {
  const candidates = process.platform === "win32"
    ? [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        `${process.env.LOCALAPPDATA ?? ""}\\Google\\Chrome\\Application\\chrome.exe`,
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      ]
    : process.platform === "darwin"
      ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
      : ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
  const found = candidates.find((candidate) => candidate && existsSync(candidate));
  if (!found) throw new Error("Chrome is unavailable. Set CHROME_PATH.");
  return found;
}

export async function renderSocialImage(input: SocialImageInput): Promise<Uint8Array> {
  const puppeteer = (await import("puppeteer-core")).default;
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const browser = isServerless
    ? await (async () => {
        const chromium = (await import("@sparticuz/chromium")).default;
        return puppeteer.launch({
          args: chromium.args,
          executablePath: await chromium.executablePath(),
          headless: true,
        });
      })()
    : await puppeteer.launch({
        executablePath: process.env.CHROME_PATH || guessLocalChrome(),
        headless: true,
        args: ["--no-sandbox", "--disable-dev-shm-usage"],
      });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 1 });
    await page.setContent(buildHtml(input), { waitUntil: "load", timeout: 45_000 });
    await page.evaluateHandle("document.fonts.ready");
    return await page.screenshot({ type: "png", fullPage: false });
  } finally {
    await browser.close();
  }
}
