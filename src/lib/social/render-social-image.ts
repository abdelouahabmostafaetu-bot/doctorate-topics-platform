import { existsSync } from "node:fs";
import katex from "katex";

export type SocialTheme =
  | "aurora"
  | "forest"
  | "ocean"
  | "desert"
  | "mountain"
  | "midnight";

export type SocialImageInput = {
  kind: "quote" | "problem";
  date: string;
  theme?: SocialTheme;
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

type ThemeStyle = {
  /** CSS background applied to the body (gradient painting a nature scene). */
  background: string;
  /** Extra decorative layer stacked on top of the background (SVG data URL) for texture/scenery. */
  overlay?: string;
  /** Accent color used for label + author + stars. */
  accent: string;
  /** Color of the logo pill background. */
  markBg: string;
  /** Color of the logo pill glyph. */
  markFg: string;
};

const THEMES: Record<SocialTheme, ThemeStyle> = {
  aurora: {
    background:
      "radial-gradient(1200px 700px at 20% 15%, rgba(120,220,180,.55), transparent 60%), radial-gradient(1000px 700px at 85% 25%, rgba(150,120,220,.55), transparent 60%), linear-gradient(180deg, #0a1830 0%, #10254a 55%, #071022 100%)",
    overlay:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='1080' height='1080' viewBox='0 0 1080 1080'><g opacity='0.55'><circle cx='140' cy='170' r='1.4' fill='white'/><circle cx='300' cy='90' r='1' fill='white'/><circle cx='520' cy='150' r='1.2' fill='white'/><circle cx='760' cy='90' r='1' fill='white'/><circle cx='930' cy='190' r='1.4' fill='white'/><circle cx='210' cy='260' r='.9' fill='white'/><circle cx='650' cy='230' r='1.1' fill='white'/><circle cx='420' cy='320' r='.8' fill='white'/><circle cx='860' cy='320' r='1' fill='white'/></g><path d='M0 820 L120 760 L260 800 L400 720 L560 780 L720 700 L860 780 L1000 720 L1080 760 L1080 1080 L0 1080 Z' fill='%23081226' opacity='0.9'/><path d='M0 880 L160 820 L320 860 L500 800 L680 860 L840 820 L1080 860 L1080 1080 L0 1080 Z' fill='%23050d1c'/></svg>`,
      ),
    accent: "#f5d78a",
    markBg: "#ffffff",
    markFg: "#143a6e",
  },
  forest: {
    background:
      "radial-gradient(1200px 700px at 25% 20%, rgba(180,230,180,.35), transparent 60%), linear-gradient(180deg, #0f2a1e 0%, #143d2b 50%, #081b12 100%)",
    overlay:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='1080' height='1080' viewBox='0 0 1080 1080'><g opacity='0.55'><path d='M-20 900 L60 700 L120 830 L200 620 L270 820 L350 660 L430 830 L510 640 L590 820 L680 670 L760 830 L840 650 L920 820 L1000 690 L1100 830 L1100 1080 L-20 1080 Z' fill='%23071b12'/></g><g opacity='0.85'><path d='M-20 1000 L80 840 L160 970 L260 800 L360 970 L460 830 L560 970 L660 810 L760 970 L860 830 L960 970 L1060 820 L1100 970 L1100 1080 L-20 1080 Z' fill='%23040f0a'/></g><g opacity='0.35' fill='white'><circle cx='120' cy='150' r='1'/><circle cx='300' cy='90' r='1.2'/><circle cx='540' cy='140' r='.9'/><circle cx='780' cy='100' r='1.1'/><circle cx='930' cy='170' r='1'/></g></svg>`,
      ),
    accent: "#e6c467",
    markBg: "#f4efe1",
    markFg: "#143d2b",
  },
  ocean: {
    background:
      "radial-gradient(1000px 700px at 80% 20%, rgba(255,205,120,.35), transparent 60%), linear-gradient(180deg, #0a2340 0%, #0e3a63 55%, #041525 100%)",
    overlay:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='1080' height='1080' viewBox='0 0 1080 1080'><circle cx='830' cy='230' r='90' fill='%23fbe6b3' opacity='0.85'/><circle cx='830' cy='230' r='140' fill='%23fbe6b3' opacity='0.10'/><g opacity='0.55' stroke='white' fill='none' stroke-width='1.5'><path d='M0 780 Q270 750 540 780 T1080 780'/><path d='M0 830 Q270 800 540 830 T1080 830' opacity='0.7'/><path d='M0 880 Q270 850 540 880 T1080 880' opacity='0.5'/><path d='M0 930 Q270 900 540 930 T1080 930' opacity='0.35'/></g><path d='M0 760 Q270 730 540 760 T1080 760 L1080 1080 L0 1080 Z' fill='%23052342' opacity='0.9'/></svg>`,
      ),
    accent: "#ffd88a",
    markBg: "#ffffff",
    markFg: "#0e3a63",
  },
  desert: {
    background:
      "radial-gradient(1000px 700px at 75% 20%, rgba(255,190,120,.55), transparent 60%), linear-gradient(180deg, #3a1c14 0%, #7a3820 45%, #d18a4e 80%, #f2c890 100%)",
    overlay:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='1080' height='1080' viewBox='0 0 1080 1080'><circle cx='820' cy='260' r='110' fill='%23ffd28a' opacity='0.9'/><path d='M-20 780 Q200 680 460 760 Q680 830 940 700 Q1050 660 1120 720 L1120 1080 L-20 1080 Z' fill='%23a45a2c' opacity='0.85'/><path d='M-20 880 Q220 800 500 870 Q760 940 1120 830 L1120 1080 L-20 1080 Z' fill='%236b3618' opacity='0.9'/><path d='M-20 970 Q220 920 540 970 Q820 1010 1120 950 L1120 1080 L-20 1080 Z' fill='%23421e0d'/></svg>`,
      ),
    accent: "#fff1c8",
    markBg: "#fff4dd",
    markFg: "#5a2a12",
  },
  mountain: {
    background:
      "radial-gradient(1100px 700px at 80% 20%, rgba(255,190,150,.45), transparent 60%), linear-gradient(180deg, #1b1230 0%, #3a2755 45%, #6e4271 75%, #d17b6b 100%)",
    overlay:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='1080' height='1080' viewBox='0 0 1080 1080'><circle cx='820' cy='250' r='95' fill='%23fddca6' opacity='0.9'/><path d='M-20 780 L180 540 L340 720 L520 480 L720 700 L900 560 L1120 760 L1120 1080 L-20 1080 Z' fill='%232a1a3f' opacity='0.9'/><path d='M-20 880 L140 700 L320 840 L500 660 L720 850 L900 720 L1120 860 L1120 1080 L-20 1080 Z' fill='%23180d26' opacity='0.95'/><path d='M180 540 L230 620 L260 590 L340 720 L280 720 Z' fill='white' opacity='0.55'/><path d='M520 480 L580 570 L620 540 L720 700 L640 700 Z' fill='white' opacity='0.5'/></svg>`,
      ),
    accent: "#ffd7a8",
    markBg: "#ffffff",
    markFg: "#3a2755",
  },
  midnight: {
    background:
      "linear-gradient(168deg, #0b2444 0%, #143a6e 58%, #0f2d55 100%)",
    accent: "#d9b95c",
    markBg: "#ffffff",
    markFg: "#143a6e",
  },
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
  const theme = THEMES[input.theme ?? "aurora"];

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
    position: relative;
    background: ${theme.background};
    color: #f7fafc;
    font-family: "Inter", "Cairo", Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .scene { position: absolute; inset: 0; background-image: url("${theme.overlay ?? ""}"); background-size: cover; background-position: center; pointer-events: none; }
  .veil { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.15) 45%, rgba(0,0,0,.55) 100%); pointer-events: none; }
  .sheet { position: relative; z-index: 2; width: 100%; height: 100%; padding: 96px 104px 84px; display: flex; flex-direction: column; }

  .masthead { display: flex; align-items: center; justify-content: space-between; }
  .identity { display: flex; align-items: center; gap: 13px; }
  .mark {
    width: 46px; height: 46px; flex: none; border-radius: 50%;
    display: grid; place-items: center;
    background: ${theme.markBg}; color: ${theme.markFg};
    font-family: "EB Garamond", Georgia, serif; font-style: italic; font-size: 30px; line-height: 1;
    box-shadow: 0 6px 20px rgba(0,0,0,.35);
  }
  .wordmark { display: flex; flex-direction: column; gap: 3px; }
  .wordmark b { font-size: 15px; font-weight: 600; letter-spacing: .18em; text-transform: uppercase; color: #ffffff; text-shadow: 0 2px 12px rgba(0,0,0,.5); }
  .wordmark span { font-family: "Cairo", sans-serif; font-size: 11px; font-weight: 300; letter-spacing: .02em; color: rgba(255,255,255,.72); }
  .label { font-family: "Cairo", sans-serif; font-size: 15px; font-weight: 600; letter-spacing: .04em; color: ${theme.accent}; text-shadow: 0 2px 10px rgba(0,0,0,.5); }
  .rule { height: 1px; margin-top: 26px; background: linear-gradient(90deg, ${theme.accent}CC, rgba(255,255,255,.10)); }

  .content { flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: center; padding: 40px 6px; }
  .meta { display: flex; align-items: center; gap: 16px; margin-bottom: 26px; font-size: 15px; letter-spacing: .06em; text-transform: uppercase; color: rgba(255,255,255,.78); }
  .meta .stars { color: ${theme.accent}; letter-spacing: .12em; text-transform: none; }
  .meta .source { margin-left: auto; text-transform: none; letter-spacing: .01em; }

  .statement { font-size: ${size}px; line-height: 1.72; font-weight: 400; color: #f4f7fb; overflow-wrap: anywhere; text-shadow: 0 2px 14px rgba(0,0,0,.35); }
  .display-math { margin: 22px 0; text-align: center; }
  .katex { font-size: 1.04em; color: #ffffff; }
  .tex-fallback { font-family: "EB Garamond", Georgia, serif; font-style: italic; }

  .quote { direction: rtl; text-align: center; font-family: "Cairo", sans-serif; font-size: ${size}px; font-weight: 400; line-height: 2.0; color: #f6f8fc; text-shadow: 0 2px 14px rgba(0,0,0,.4); }
  .quote-open { font-family: "EB Garamond", Georgia, serif; font-size: 74px; line-height: 0; color: ${theme.accent}; display: block; margin-bottom: 34px; }
  .author { direction: rtl; margin-top: 40px; text-align: center; font-family: "Cairo", sans-serif; font-size: 17px; font-weight: 600; letter-spacing: .02em; color: ${theme.accent}; }

  .footer { display: flex; align-items: center; justify-content: space-between; padding-top: 22px; border-top: 1px solid rgba(255,255,255,.18); font-size: 13px; letter-spacing: .06em; color: rgba(255,255,255,.75); }
  .footer .site { color: #ffffff; font-weight: 500; }
  .footer .date { font-family: "Cairo", "Inter", sans-serif; letter-spacing: .01em; }
</style>
</head>
<body>
  <div class="scene"></div>
  <div class="veil"></div>
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
    await sleep(700);
    return await page.screenshot({ type: "png", fullPage: false });
  } finally {
    await browser.close();
  }
}
