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

const FONTS_CSS =
  "https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&family=Inter:wght@300;400;500;600&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap";
const KATEX_CSS = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css";

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
      output: "html",
      macros: {
        "\\R": "\\mathbb{R}",
        "\\N": "\\mathbb{N}",
        "\\Z": "\\mathbb{Z}",
        "\\Q": "\\mathbb{Q}",
        "\\C": "\\mathbb{C}",
        "\\L": "\\mathcal{L}",
      },
    });
  } catch {
    return `<span class="tex-fallback">${escapeHtml(tex)}</span>`;
  }
}

function renderMixed(source: string) {
  const parts = source.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$)/g);
  return parts
    .map((part) => {
      if (!part) return "";
      if (part.startsWith("$$") && part.endsWith("$$") && part.length > 4) {
        return `<div class="display-math">${renderMath(part.slice(2, -2), true)}</div>`;
      }
      if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
        return renderMath(part.slice(1, -1), false);
      }
      return escapeHtml(part)
        .replace(/\n{2,}/g, "<br /><br />")
        .replace(/\n/g, "<br />");
    })
    .join("");
}

function prettyDate(date: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Africa/Algiers",
      numberingSystem: "latn",
    }).format(new Date(`${date}T12:00:00+01:00`));
  } catch {
    return date;
  }
}

/** Restrained, editorial type scale. Smaller than a poster, sized to the text length. */
function fontSizeFor(text: string, kind: "quote" | "problem") {
  const length = text.length;
  if (kind === "quote") {
    if (length > 420) return 30;
    if (length > 260) return 34;
    if (length > 140) return 39;
    return 44;
  }
  if (length > 900) return 21;
  if (length > 650) return 23;
  if (length > 420) return 26;
  if (length > 230) return 29;
  return 32;
}

function buildHtml(input: SocialImageInput) {
  const isQuote = input.kind === "quote";
  const rawText = isQuote
    ? input.quote?.text?.trim() || "اكتب مقولة اليوم"
    : input.problem?.statement?.trim() || "Write the problem statement here.";

  const body = isQuote
    ? escapeHtml(rawText).replace(/\n/g, "<br />")
    : renderMixed(rawText);

  const size = fontSizeFor(rawText, input.kind);
  const level = input.problem?.difficulty ?? 2;
  const difficulty = "★".repeat(level) + "☆".repeat(3 - level);
  const label = isQuote ? "مقولة اليوم" : "مسألة اليوم";
  const date = prettyDate(input.date, isQuote ? "ar-DZ" : "en-GB");

  return `<!doctype html>
<html lang="${isQuote ? "ar" : "en"}" dir="ltr">
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="${FONTS_CSS}" />
<link rel="stylesheet" href="${KATEX_CSS}" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; width: 1080px; height: 1080px; overflow: hidden; }
  body {
    background: linear-gradient(168deg, #0b2444 0%, #143a6e 58%, #0f2d55 100%);
    color: #f7fafc;
    font-family: "Inter", "Cairo", Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .sheet { width: 100%; height: 100%; padding: 96px 104px 84px; display: flex; flex-direction: column; }

  /* ---------- masthead ---------- */
  .masthead { display: flex; align-items: center; justify-content: space-between; }
  .identity { display: flex; align-items: center; gap: 13px; }
  .mark {
    width: 46px; height: 46px; flex: none; border-radius: 50%;
    display: grid; place-items: center;
    background: #ffffff; color: #143a6e;
    font-family: "EB Garamond", Georgia, serif; font-style: italic; font-size: 30px; line-height: 1;
  }
  .wordmark { display: flex; flex-direction: column; gap: 3px; }
  .wordmark b { font-size: 15px; font-weight: 600; letter-spacing: .18em; text-transform: uppercase; color: #ffffff; }
  .wordmark span { font-family: "Cairo", sans-serif; font-size: 11px; font-weight: 300; letter-spacing: .02em; color: rgba(255,255,255,.55); }
  .label { font-family: "Cairo", sans-serif; font-size: 15px; font-weight: 600; letter-spacing: .04em; color: #d9b95c; }
  .rule { height: 1px; margin-top: 26px; background: linear-gradient(90deg, rgba(217,185,92,.85), rgba(255,255,255,.10)); }

  /* ---------- body ---------- */
  .content { flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: center; padding: 40px 6px; }
  .meta { display: flex; align-items: center; gap: 16px; margin-bottom: 26px; font-size: 15px; letter-spacing: .06em; text-transform: uppercase; color: rgba(255,255,255,.62); }
  .meta .stars { color: #d9b95c; letter-spacing: .12em; text-transform: none; }
  .meta .source { margin-left: auto; text-transform: none; letter-spacing: .01em; }

  .statement { font-size: ${size}px; line-height: 1.72; font-weight: 400; color: #f4f7fb; overflow-wrap: anywhere; }
  .display-math { margin: 22px 0; text-align: center; }
  .katex { font-size: 1.04em; color: #ffffff; }
  .tex-fallback { font-family: "EB Garamond", Georgia, serif; font-style: italic; }

  .quote { direction: rtl; text-align: center; font-family: "Cairo", sans-serif; font-size: ${size}px; font-weight: 400; line-height: 2.0; color: #f6f8fc; }
  .quote-open { font-family: "EB Garamond", Georgia, serif; font-size: 74px; line-height: 0; color: rgba(217,185,92,.85); display: block; margin-bottom: 34px; }
  .author { direction: rtl; margin-top: 40px; text-align: center; font-family: "Cairo", sans-serif; font-size: 17px; font-weight: 600; letter-spacing: .02em; color: #d9b95c; }

  /* ---------- footer ---------- */
  .footer { display: flex; align-items: center; justify-content: space-between; padding-top: 22px; border-top: 1px solid rgba(255,255,255,.14); font-size: 13px; letter-spacing: .06em; color: rgba(255,255,255,.58); }
  .footer .site { color: rgba(255,255,255,.86); font-weight: 500; }
  .footer .date { font-family: "Cairo", "Inter", sans-serif; letter-spacing: .01em; }
</style>
</head>
<body>
  <main class="sheet">
    <header class="masthead">
      <div class="identity">
        <div class="mark">∂</div>
        <div class="wordmark"><b>DocMath DZ</b><span>منصة مواضيع دكتوراه الرياضيات</span></div>
      </div>
      <div class="label">${label}</div>
    </header>
    <div class="rule"></div>

    <section class="content">
      ${
        isQuote
          ? `<div class="quote"><span class="quote-open">”</span>${body}</div>${
              input.quote?.author?.trim()
                ? `<div class="author">— ${escapeHtml(input.quote.author.trim())}</div>`
                : ""
            }`
          : `<div class="meta"><span>${escapeHtml(
              input.problem?.subject || "Mathematics",
            )}</span><span class="stars">${difficulty}</span><span class="source">${escapeHtml(
              input.problem?.source || "DocMath DZ",
            )}</span></div><div class="statement">${body}</div>`
      }
    </section>

    <footer class="footer">
      <span class="site">www.docmathdz.dev</span>
      <span class="date">${escapeHtml(date)}</span>
    </footer>
  </main>
</body>
</html>`;
}

function guessLocalChrome() {
  const candidates =
    process.platform === "win32"
      ? [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
          `${process.env.LOCALAPPDATA ?? ""}\\Google\\Chrome\\Application\\chrome.exe`,
          "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        ]
      : process.platform === "darwin"
        ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
        : [
            "/usr/bin/google-chrome",
            "/usr/bin/google-chrome-stable",
            "/usr/bin/chromium",
            "/usr/bin/chromium-browser",
          ];
  const found = candidates.find((candidate) => candidate && existsSync(candidate));
  if (!found) throw new Error("Chrome is unavailable. Set CHROME_PATH.");
  return found;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
    await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 2 });
    await page.setContent(buildHtml(input), { waitUntil: "load", timeout: 45_000 });
    await page.evaluateHandle("document.fonts.ready");
    // مهلة قصيرة إضافية ليتم تحميل الخطوط الخارجية بالكامل قبل الالتقاط
    await sleep(600);
    return await page.screenshot({ type: "png", fullPage: false });
  } finally {
    await browser.close();
  }
}
