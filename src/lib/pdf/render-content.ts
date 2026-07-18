// تحويل نص التمرين (Markdown + LaTeX) إلى HTML للطباعة — KaTeX يُصيّر المعادلات بخط LaTeX الحقيقي
import katex from "katex";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// نفس التطبيع المستخدم في MathContent (صيغة GitLab → صيغة قياسية)
function normalizeMath(src: string): string {
  return src
    .replace(
      /```math\r?\n([\s\S]*?)```/g,
      (_m, body) => "\n$$\n" + body + "\n$$\n",
    )
    .replace(/\$`([\s\S]*?)`\$/g, (_m, body) => "$" + body + "$");
}

function renderTex(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      strict: "ignore",
    });
  } catch {
    return "<code>" + escapeHtml(tex) + "</code>";
  }
}

function renderTable(lines: string[]): string {
  const rows = lines
    .filter((l) => !/^[\s|:\-]+$/.test(l))
    .map((l) =>
      l
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((c) => c.trim()),
    );
  if (rows.length === 0) return "";
  const head = rows[0];
  const body = rows.slice(1);
  const th = head.map((c) => "<th>" + c + "</th>").join("");
  const trs = body
    .map((r) => "<tr>" + r.map((c) => "<td>" + c + "</td>").join("") + "</tr>")
    .join("");
  return (
    "<table><thead><tr>" +
    th +
    "</tr></thead><tbody>" +
    trs +
    "</tbody></table>"
  );
}

// النطاق المطلق للموقع — يُستخدم لتحويل روابط الصور النسبية (مثل /figures/..)
// إلى روابط كاملة يستطيع متصفح PDF بدون واجهة (Chromium) تحميلها فعليًا عبر الشبكة
const SITE_ORIGIN =
  (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "") ||
  "https://www.docmathdz.dev";

function resolveImageSrc(src: string): string {
  const s = (src ?? "").trim();
  if (/^https?:\/\//i.test(s) || /^data:/i.test(s)) return s;
  return SITE_ORIGIN + (s.startsWith("/") ? s : "/" + s);
}

function renderImage(alt: string, src: string): string {
  const url = escapeHtml(resolveImageSrc(src));
  const altText = escapeHtml(alt || "شكل توضيحي");
  return (
    '<div class="pdf-figure" style="text-align:center;margin:8px 0;">' +
    '<img src="' +
    url +
    '" alt="' +
    altText +
    '" style="display:inline-block;max-width:100%;max-height:110mm;' +
    'border:1px solid #ccc;border-radius:6px;background:#fff;padding:4px;" />' +
    "</div>"
  );
}

/**
 * محوّل خفيف: معادلات كتلية $$..$$ وسطرية $..$ عبر KaTeX، وصور Markdown ![alt](src)،
 * مع دعم أساسي لـ Markdown (عريض، مائل، قوائم مرقمة/نقطية، جداول، عناوين)
 */
export function renderMathHtml(src: string): string {
  const math: string[] = [];
  const images: string[] = [];
  let text = normalizeMath(src ?? "");

  // 0) استخراج الصور أولًا (قبل أي تهريب/معالجة نصية) واستبدالها برموز مؤقتة
  text = text.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
    (_m, alt, url) => {
      images.push(renderImage(String(alt), String(url)));
      return "\n@@IMG" + (images.length - 1) + "@@\n";
    },
  );

  // 1) استخراج المعادلات الكتلية ثم السطرية واستبدالها برموز مؤقتة
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_m, tex) => {
    math.push(renderTex(String(tex).trim(), true));
    return "\n@@M" + (math.length - 1) + "@@\n";
  });
  text = text.replace(/\$([^$\n]+?)\$/g, (_m, tex) => {
    math.push(renderTex(String(tex), false));
    return "@@M" + (math.length - 1) + "@@";
  });

  // 2) تأمين النص ثم Markdown سطري
  text = escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
    .replace(/`([^`\n]+)`/g, "<code>$1</code>");

  // 3) بناء الكتل سطرًا سطرًا
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  let list: "ol" | "ul" | null = null;
  let para: string[] = [];
  let table: string[] | null = null;

  const flushPara = () => {
    if (para.length) {
      out.push("<p>" + para.join(" ") + "</p>");
      para = [];
    }
  };
  const closeList = () => {
    if (list) {
      out.push("</" + list + ">");
      list = null;
    }
  };
  const flushTable = () => {
    if (table) {
      out.push(renderTable(table));
      table = null;
    }
  };

  for (const raw of lines) {
    const t = raw.trim();
    if (!t) {
      flushPara();
      closeList();
      flushTable();
      continue;
    }
    if (/^@@IMG\d+@@$/.test(t)) {
      // صورة مستقلة — سطر خاص بها
      flushPara();
      flushTable();
      closeList();
      out.push(t);
      continue;
    }
    if (/^@@M\d+@@$/.test(t)) {
      // معادلة كتلية مستقلة
      flushPara();
      flushTable();
      if (list) {
        out.push('<div class="math-block in-list">' + t + "</div>");
      } else {
        out.push('<div class="math-block">' + t + "</div>");
      }
      continue;
    }
    if (/^\|/.test(t)) {
      flushPara();
      closeList();
      if (!table) table = [];
      table.push(t);
      continue;
    }
    flushTable();
    const h = t.match(/^(#{1,4})\s+(.*)$/);
    const ol = t.match(/^(\d+)[.)]\s+(.*)$/);
    const ul = t.match(/^[-*•]\s+(.*)$/);
    if (h) {
      flushPara();
      closeList();
      out.push("<h4>" + h[2] + "</h4>");
      continue;
    }
    if (ol) {
      flushPara();
      if (list !== "ol") {
        closeList();
        out.push("<ol>");
        list = "ol";
      }
      out.push('<li value="' + ol[1] + '">' + ol[2] + "</li>");
      continue;
    }
    if (ul) {
      flushPara();
      if (list !== "ul") {
        closeList();
        out.push("<ul>");
        list = "ul";
      }
      out.push("<li>" + ul[1] + "</li>");
      continue;
    }
    closeList();
    para.push(t);
  }
  flushPara();
  closeList();
  flushTable();

  // 4) إرجاع المعادلات والصور المُصيّرة
  return out
    .join("\n")
    .replace(/@@M(\d+)@@/g, (_m, i) => math[Number(i)] ?? "")
    .replace(/@@IMG(\d+)@@/g, (_m, i) => images[Number(i)] ?? "");
}
