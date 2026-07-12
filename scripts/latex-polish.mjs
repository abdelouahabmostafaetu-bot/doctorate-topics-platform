/**
 * تحسين صياغة LaTeX لكل التمارين عبر Gemini — بدون لمس النص الأصلي.
 *
 * النتيجة تُحفظ في حقل polished مع latexReview: "pending"،
 * ثم تُراجعها وتقبلها/ترفضها من صفحة /admin/latex-review.
 *
 * الاستخدام:
 *   node scripts/latex-polish.mjs        # يعالج 10 مواضيع
 *   node scripts/latex-polish.mjs 50     # يعالج 50 موضوعًا
 *
 * المتطلبات: GEMINI_API_KEY في .env (مفتاح مجاني من aistudio.google.com)
 */
import { config } from "dotenv";
config({ path: ".env" });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) {
  console.error("\u274c أضف GEMINI_API_KEY في ملف .env أولًا (مفتاح مجاني من aistudio.google.com)");
  process.exit(1);
}
const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const LIMIT = Math.max(1, parseInt(process.argv[2] || "10", 10) || 10);

// قواعد الأسلوب — مهم جدًا: الحفاظ على صيغة GitLab للرياضيات التي يفهمها الموقع
const STYLE_RULES = `Tu es un expert LaTeX pour des sujets de concours de doctorat en math\u00e9matiques.
Reformate le texte suivant selon ces r\u00e8gles STRICTES :
1. Ne change JAMAIS le contenu math\u00e9matique ni le texte fran\u00e7ais. Uniquement la mise en forme LaTeX.
2. CONSERVE le format des formules : $\`...\`$ pour les formules en ligne, et les blocs \`\`\`math ... \`\`\` pour les formules centr\u00e9es. N'utilise JAMAIS $$...$$ ni \\[...\\].
3. Parenth\u00e8ses dimensionn\u00e9es : \\bigl( ... \\bigr) autour des expressions compos\u00e9es.
4. Espace fine avant les diff\u00e9rentielles : \\,dx et \\,dt.
5. \\displaystyle\\int pour les int\u00e9grales importantes en ligne.
6. \\quad avant \\forall ; notations standard : \\mathcal{D}(I), C^\\infty, H^1(I), L^2(I).
7. Les syst\u00e8mes et probl\u00e8mes variationnels avec \\begin{cases} ... \\end{cases} et \\\\[6pt] entre les lignes longues.
8. Utilise UNIQUEMENT des commandes support\u00e9es par KaTeX.
9. Conserve la num\u00e9rotation a) b) c), les retours \u00e0 la ligne et la structure Markdown existante (gras, N.B., etc.).
10. R\u00e9ponds UNIQUEMENT avec le texte reformat\u00e9, sans aucune explication, sans bloc de code autour.

Texte \u00e0 reformater :

`;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** يزيل سياج markdown إن غلّف النموذج الناتج به بالخطأ */
function cleanup(s) {
  let t = String(s).trim();
  if (t.startsWith("```") && t.endsWith("```") && !t.startsWith("```math")) {
    t = t.replace(/^```[a-z]*\r?\n/, "").replace(/\r?\n```$/, "").trim();
  }
  return t;
}

/** فحص سلامة بسيط: الناتج يجب ألا يفقد أكثر من ثلث الطول ولا يستخدم $$ */
function looksSafe(src, out) {
  if (!out || out.length < src.length * 0.6) return false;
  if (out.includes("$$")) return false;
  return true;
}

async function gemini(text) {
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent?key=" + KEY,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
          }),
        },
      );
      if (res.status === 429 || res.status >= 500) {
        console.log(`   \u23f3 ضغط على الـ API (${res.status}) — انتظار ${attempt * 10} ثوانٍ...`);
        await sleep(attempt * 10000);
        continue;
      }
      if (!res.ok) {
        throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      }
      const data = await res.json();
      const out = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!out) throw new Error("رد فارغ من النموذج");
      return cleanup(out);
    } catch (e) {
      lastErr = e;
      const msg = String(e?.message ?? e);
      if (msg.includes("fetch failed") || msg.includes("network")) {
        await sleep(attempt * 5000);
        continue;
      }
      throw e;
    }
  }
  throw lastErr ?? new Error("فشل بعد 4 محاولات");
}

/** يعيد المحاولة عند أخطاء شبكة Atlas */
async function withRetry(label, fn) {
  let lastErr;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const msg = String(e?.message ?? e);
      const retryable =
        msg.includes("timed out") ||
        msg.includes("Retryable") ||
        msg.includes("I/O error") ||
        msg.includes("connection") ||
        msg.includes("Server selection");
      if (!retryable) throw e;
      const wait = attempt * 3000;
      console.log(`   \u26a0\ufe0f ${label}: مهلة شبكة (${attempt}/5)، إعادة بعد ${wait / 1000} ثوانٍ...`);
      await sleep(wait);
    }
  }
  throw lastErr;
}

console.log("\ud83d\udd0c الاتصال بقاعدة البيانات...");
await withRetry("الاتصال", () => prisma.$connect());

// المواضيع غير المعالجة بعد فقط (latexReview = null)
const topics = await withRetry("جلب المواضيع", () =>
  prisma.topic.findMany({
    where: { latexReview: null, status: "published" },
    orderBy: { year: "desc" },
    take: LIMIT,
  }),
);

const remaining = await withRetry("العد", () =>
  prisma.topic.count({ where: { latexReview: null, status: "published" } }),
);

console.log(`\ud83d\udcca ستُعالج ${topics.length} موضوعًا (المتبقي الإجمالي: ${remaining}) — النموذج: ${MODEL}`);

let okCount = 0;
let failCount = 0;

for (const [i, topic] of topics.entries()) {
  console.log(`\n\ud83d\udcc4 [${i + 1}/${topics.length}] ${topic.title}`);
  try {
    const polishedProblems = [];
    let anyChange = false;
    for (const p of topic.problems) {
      const entry = { problemNumber: p.problemNumber, statement: null, solution: null, remark: null };
      for (const field of ["statement", "solution", "remark"]) {
        const src = p[field];
        if (!src || !String(src).trim()) continue;
        const out = await gemini(STYLE_RULES + src);
        await sleep(1200); // احترام حدود الطبقة المجانية
        if (!looksSafe(src, out)) {
          console.log(`   \u26a0\ufe0f التمرين ${p.problemNumber} (${field}): ناتج مريب — تُرك الأصلي`);
          continue;
        }
        entry[field] = out;
        if (out !== src) anyChange = true;
      }
      polishedProblems.push(entry);
    }
    await withRetry("الحفظ", () =>
      prisma.topic.update({
        where: { id: topic.id },
        data: {
          polished: {
            problems: polishedProblems,
            model: MODEL,
            at: new Date().toISOString(),
            anyChange,
          },
          latexReview: "pending",
        },
      }),
    );
    okCount++;
    console.log(`   \u2705 جاهز للمراجعة${anyChange ? "" : " (بدون تغييرات تُذكر)"}`);
  } catch (e) {
    failCount++;
    console.log(`   \u274c فشل: ${String(e?.message ?? e).slice(0, 200)}`);
  }
}

console.log(`\n\ud83c\udfc1 انتهى: ${okCount} نجح · ${failCount} فشل · راجعها الآن في /admin/latex-review`);
await prisma.$disconnect();
