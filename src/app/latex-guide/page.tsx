import Link from "next/link";
import { MathContent } from "@/components/math-content";

export const metadata = {
  title: "دليل LaTeX — منصة مواضيع دكتوراه الرياضيات",
  description:
    "دليل مبسط واحترافي لكتابة التمارين الرياضية بلغة LaTeX داخل محرر الموقع.",
};

type Example = { label?: string; code: string };
type GuideSection = {
  id: string;
  title: string;
  intro?: string;
  examples: Example[];
};

const SECTIONS: GuideSection[] = [
  {
    id: "basics",
    title: "١. الأساسيات",
    intro:
      "اكتب النص بشكل عادي، وضع الرموز والمعادلات بين $ ... $ داخل السطر، أو بين $$ ... $$ لمعادلة في سطر مستقل.",
    examples: [
      {
        label: "معادلة داخل السطر",
        code: "Soit $x^2 + y^2 = z^2$ une équation.",
      },
      {
        label: "معادلة في سطر مستقل",
        code: "$$\\int_0^1 x^2\\,dx = \\frac{1}{3}$$",
      },
      { label: "نص غليظ (B)", code: "**Exercice important**" },
      { label: "نص مائل (I)", code: "*Remarque :* on suppose $x > 0$." },
      {
        label: "قائمة مرقمة",
        code: "1. Montrer que $f$ est continue.\n2. Calculer $f'(x)$.\n3. En déduire le tableau de variations.",
      },
      {
        label: "جدول",
        code: "| $x$ | $0$ | $1$ |\n| --- | --- | --- |\n| $f(x)$ | $1$ | $e$ |",
      },
    ],
  },
  {
    id: "fractions",
    title: "٢. الكسور والجذور والأسس",
    examples: [
      { label: "كسر", code: "$\\frac{a}{b}$" },
      { label: "جذر", code: "$\\sqrt{x}$ , $\\sqrt[3]{x}$" },
      { label: "أس وفهرس", code: "$x^{n+1}$ , $a_{i,j}$" },
      {
        label: "كسر مركب",
        code: "$$\\frac{1}{1+\\frac{1}{x}}$$",
      },
    ],
  },
  {
    id: "calculus",
    title: "٣. التحليل: مجاميع، تكاملات، نهايات",
    examples: [
      {
        label: "مجموع",
        code: "$$\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}$$",
      },
      { label: "تكامل", code: "$$\\int_a^b f(t)\\,dt$$" },
      {
        label: "نهاية",
        code: "$$\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$$",
      },
      {
        label: "اشتقاق",
        code: "$f'(x)$ , $\\frac{\\partial f}{\\partial x}$",
      },
      { label: "ما لا نهاية", code: "$x \\to +\\infty$" },
    ],
  },
  {
    id: "sets",
    title: "٤. المجموعات والمنطق",
    examples: [
      {
        label: "الانتماء والاحتواء",
        code: "$x \\in \\mathbb{R}$ , $A \\subset B$",
      },
      {
        label: "مجموعات الأعداد",
        code: "$\\mathbb{N}, \\mathbb{Z}, \\mathbb{Q}, \\mathbb{R}, \\mathbb{C}$",
      },
      { label: "اتحاد وتقاطع", code: "$A \\cup B$ , $A \\cap B$" },
      {
        label: "لكل / يوجد",
        code: "$\\forall \\varepsilon > 0, \\exists \\delta > 0$",
      },
      {
        label: "متباينات",
        code: "$x \\leq y$ , $x \\geq y$ , $x \\neq y$",
      },
    ],
  },
  {
    id: "greek",
    title: "٥. الأحرف اليونانية",
    examples: [
      {
        label: "أحرف صغيرة",
        code: "$\\alpha, \\beta, \\gamma, \\delta, \\varepsilon, \\lambda, \\mu, \\pi, \\sigma, \\varphi, \\omega$",
      },
      {
        label: "أحرف كبيرة",
        code: "$\\Gamma, \\Delta, \\Lambda, \\Sigma, \\Phi, \\Omega$",
      },
    ],
  },
  {
    id: "matrices",
    title: "٦. المصفوفات والحالات",
    examples: [
      {
        label: "مصفوفة",
        code: "$$A = \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$$",
      },
      {
        label: "محدد",
        code: "$$\\det(A) = \\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix} = ad - bc$$",
      },
      {
        label: "دالة معرفة بحالات",
        code: "$$f(x) = \\begin{cases} x^2 & \\text{si } x \\geq 0 \\\\ -x & \\text{si } x < 0 \\end{cases}$$",
      },
    ],
  },
  {
    id: "full-example",
    title: "٧. مثال كامل لتمرين",
    intro: "هكذا يبدو تمرين كامل كما تكتبه في المحرر وكما سيظهر للطلبة.",
    examples: [
      {
        code: "Soit $f : \\mathbb{R} \\to \\mathbb{R}$ définie par $f(x) = x e^{-x^2}$.\n\n1. Montrer que $f$ est de classe $C^1$ sur $\\mathbb{R}$.\n2. Calculer $$\\int_0^{+\\infty} f(x)\\,dx.$$\n3. Étudier la convergence de la série $\\sum_{n \\geq 1} f(n)$.",
      },
    ],
  },
];

// مراجع مبسطة لتعلّم LaTeX
const REFERENCES: Array<{ title: string; desc: string; url: string }> = [
  {
    title: "Learn LaTeX in 30 minutes — Overleaf",
    desc: "أشهر درس مبسط للمبتدئين — تتعلم الأساسيات في نصف ساعة",
    url: "https://www.overleaf.com/learn/latex/Learn_LaTeX_in_30_minutes",
  },
  {
    title: "قائمة رموز KaTeX المدعومة",
    desc: "كل الرموز والدوال التي يدعمها عارض المعادلات في هذا الموقع",
    url: "https://katex.org/docs/supported.html",
  },
  {
    title: "Detexify",
    desc: "ارسم الرمز بالفأرة وسيعطيك أمر LaTeX الخاص به فورًا",
    url: "https://detexify.kirelabs.org/classify.html",
  },
  {
    title: "LaTeX/Mathematics — Wikibooks",
    desc: "مرجع شامل لكتابة الرياضيات بـ LaTeX",
    url: "https://en.wikibooks.org/wiki/LaTeX/Mathematics",
  },
];

export default function LatexGuidePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header>
        <h1 className="text-xl font-bold">📖 دليل الكتابة بـ LaTeX</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
          كل ما تحتاجه لكتابة تمرين رياضي احترافي داخل محرر الموقع: اكتب
          النص بشكل عادي، وضع الرموز والمعادلات بين علامتي الدولار. في كل
          مثال أدناه: على اليمين ما تكتبه، وعلى اليسار النتيجة كما ستظهر.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          💡 يمكنك طي أي قسم أو فتحه بالنقر على عنوانه.
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row">
        {/* الفهرس الجانبي — بدون صندوق */}
        <aside className="shrink-0 lg:w-56">
          <nav className="text-sm lg:sticky lg:top-16">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              المحتويات
            </p>
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block rounded px-2 py-1.5 text-muted-foreground transition hover:bg-muted hover:text-primary"
              >
                {s.title}
              </a>
            ))}
            <a
              href="#references"
              className="block rounded px-2 py-1.5 text-muted-foreground transition hover:bg-muted hover:text-primary"
            >
              ٨. مراجع لتعلّم LaTeX
            </a>
            <div className="mt-3">
              <Link
                href="/contribute"
                className="inline-block rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-90"
              >
                🌱 ابدأ المساهمة
              </Link>
            </div>
          </nav>
        </aside>

        {/* الأقسام — بدون صناديق، قابلة للطي */}
        <div className="min-w-0 flex-1 space-y-6">
          {SECTIONS.map((s) => (
            <details
              key={s.id}
              id={s.id}
              open
              className="group scroll-mt-20"
            >
              <summary className="flex cursor-pointer select-none list-none items-center gap-3 py-1 [&::-webkit-details-marker]:hidden">
                <h2 className="shrink-0 text-base font-bold">{s.title}</h2>
                <span className="h-px flex-1 bg-gradient-to-l from-border to-transparent" />
                <span className="text-[10px] text-muted-foreground transition-transform group-open:rotate-180">
                  ▼
                </span>
              </summary>

              {s.intro && (
                <p className="mt-1 text-sm leading-7 text-muted-foreground">
                  {s.intro}
                </p>
              )}

              <div className="mt-2 divide-y">
                {s.examples.map((ex, i) => (
                  <div key={i} className="grid gap-4 py-4 sm:grid-cols-2">
                    <div>
                      <div className="mb-1.5 text-xs font-medium text-muted-foreground">
                        {ex.label ? `${ex.label} — ` : ""}ما تكتبه:
                      </div>
                      <pre
                        dir="ltr"
                        className="overflow-x-auto whitespace-pre-wrap rounded-md bg-secondary/40 p-3 text-left text-[13px] leading-6"
                      >
                        {ex.code}
                      </pre>
                    </div>
                    <div>
                      <div className="mb-1.5 text-xs font-medium text-muted-foreground">
                        النتيجة:
                      </div>
                      <MathContent content={ex.code} className="text-sm" />
                    </div>
                  </div>
                ))}
              </div>
            </details>
          ))}

          {/* مراجع لتعلّم LaTeX */}
          <details id="references" open className="group scroll-mt-20">
            <summary className="flex cursor-pointer select-none list-none items-center gap-3 py-1 [&::-webkit-details-marker]:hidden">
              <h2 className="shrink-0 text-base font-bold">
                ٨. 📚 مراجع لتعلّم LaTeX
              </h2>
              <span className="h-px flex-1 bg-gradient-to-l from-border to-transparent" />
              <span className="text-[10px] text-muted-foreground transition-transform group-open:rotate-180">
                ▼
              </span>
            </summary>
            <p className="mt-1 text-sm leading-7 text-muted-foreground">
              مصادر بسيطة ومجانية لمن يريد التعمق أكثر:
            </p>
            <div className="mt-2 divide-y">
              {REFERENCES.map((r) => (
                <a
                  key={r.url}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/ref block py-3"
                >
                  <p className="text-sm font-medium text-primary group-hover/ref:underline">
                    🔗 {r.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{r.desc}</p>
                </a>
              ))}
            </div>
          </details>

          <p className="text-center">
            <Link href="/contribute" className="text-sm text-primary hover:underline">
              ← العودة لصفحة المساهمة
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
