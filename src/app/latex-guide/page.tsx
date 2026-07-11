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

export default function LatexGuidePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header>
        <h1 className="text-2xl font-bold">📖 دليل الكتابة بـ LaTeX</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
          كل ما تحتاجه لكتابة تمرين رياضي احترافي داخل محرر الموقع: اكتب
          النص بشكل عادي، وضع الرموز والمعادلات بين علامتي الدولار. في كل
          مثال أدناه: على اليمين ما تكتبه، وعلى اليسار النتيجة كما ستظهر.
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-6 lg:flex-row">
        {/* الفهرس الجانبي */}
        <aside className="shrink-0 lg:w-60">
          <nav className="rounded-lg border bg-card p-3 text-sm shadow-sm lg:sticky lg:top-20">
            <p className="mb-2 px-2 text-xs font-semibold text-muted-foreground">
              المحتويات
            </p>
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block rounded px-2 py-1.5 transition hover:bg-muted hover:text-primary"
              >
                {s.title}
              </a>
            ))}
            <div className="mt-3 border-t pt-3">
              <Link
                href="/contribute"
                className="block rounded-md bg-primary px-2 py-2 text-center text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                🌱 ابدأ المساهمة
              </Link>
            </div>
          </nav>
        </aside>

        {/* الأقسام */}
        <div className="min-w-0 flex-1 space-y-8">
          {SECTIONS.map((s) => (
            <section
              key={s.id}
              id={s.id}
              className="scroll-mt-20 overflow-hidden rounded-lg border bg-card shadow-sm"
            >
              <h2 className="border-b px-5 py-3 font-bold">{s.title}</h2>
              {s.intro && (
                <p className="border-b bg-muted/40 px-5 py-3 text-sm leading-7 text-muted-foreground">
                  {s.intro}
                </p>
              )}
              <div>
                {s.examples.map((ex, i) => (
                  <div
                    key={i}
                    className="grid border-b last:border-0 sm:grid-cols-2"
                  >
                    <div className="p-4">
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
                    <div className="border-t p-4 sm:border-s sm:border-t-0">
                      <div className="mb-1.5 text-xs font-medium text-muted-foreground">
                        النتيجة:
                      </div>
                      <MathContent content={ex.code} className="text-sm" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}

          <p className="text-center">
            <Link href="/contribute" className="text-primary hover:underline">
              ← العودة لصفحة المساهمة
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
