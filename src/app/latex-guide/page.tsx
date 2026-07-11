import type { Metadata } from "next";
import Link from "next/link";
import { MathContent } from "@/components/math-content";

export const metadata: Metadata = {
  title: "دليل كتابة LaTeX — مواضيع دكتوراه الرياضيات",
  description:
    "تعلّم كتابة الرموز والمعادلات الرياضية بصيغة LaTeX خطوة بخطوة مع أمثلة جاهزة.",
};

const examples: { title: string; hint: string; code: string }[] = [
  {
    title: "النص العادي والتنسيق",
    hint: "اكتب النص مباشرة، واستخدم النجوم للتنسيق (أو زري B و I في شريط الأدوات).",
    code: "Texte normal, **texte en gras**, *texte en italique*",
  },
  {
    title: "معادلة داخل السطر",
    hint: "ضع الصيغة الرياضية بين علامتي دولار $ ... $ لتظهر وسط الجملة.",
    code: String.raw`Soit $f(x) = x^2 + 1$ une fonction continue.`,
  },
  {
    title: "معادلة في سطر مستقل",
    hint: "استخدم $$ ... $$ لتظهر المعادلة كبيرة ومتوسّطة في سطر وحدها.",
    code: String.raw`$$\int_0^1 x^2 \, dx = \frac{1}{3}$$`,
  },
  {
    title: "الكسور",
    hint: "\\frac{البسط}{المقام}",
    code: String.raw`$\frac{a}{b}$ , $\frac{x+1}{x-1}$ , $\frac{1}{1+\frac{1}{x}}$`,
  },
  {
    title: "الجذور",
    hint: "\\sqrt{...} للجذر التربيعي، و\\sqrt[3]{...} للجذر الثلاثي.",
    code: String.raw`$\sqrt{x}$ , $\sqrt{x^2+1}$ , $\sqrt[3]{8} = 2$`,
  },
  {
    title: "الأس والدليل السفلي",
    hint: "^ للأس و _ للدليل، واستخدم الأقواس { } إذا كان أكثر من رمز.",
    code: String.raw`$x^2$ , $x^{n+1}$ , $u_n$ , $u_{n+1}$ , $x_i^2$`,
  },
  {
    title: "المجموع والجداء",
    hint: "\\sum للمجموع و\\prod للجداء، مع حدود سفلية وعلوية.",
    code: String.raw`$$\sum_{n=1}^{+\infty} \frac{1}{n^2} = \frac{\pi^2}{6} \qquad \prod_{i=1}^{n} i = n!$$`,
  },
  {
    title: "التكامل",
    hint: "\\int مع حدود التكامل، و \\, dx لمسافة صغيرة قبل dx.",
    code: String.raw`$$\int_{0}^{+\infty} e^{-x} \, dx = 1$$`,
  },
  {
    title: "النهايات",
    hint: "\\lim مع \\to للسهم.",
    code: String.raw`$$\lim_{n \to +\infty} \left(1 + \frac{1}{n}\right)^n = e$$`,
  },
  {
    title: "المجموعات والانتماء",
    hint: "\\mathbb للحروف المزدوجة، \\in للانتماء، \\subset للاحتواء.",
    code: String.raw`$\mathbb{N}, \mathbb{Z}, \mathbb{Q}, \mathbb{R}, \mathbb{C}$ , $x \in \mathbb{R}$ , $A \subset B$ , $\emptyset$`,
  },
  {
    title: "المقارنة والرموز الشائعة",
    hint: "\\leq أصغر أو يساوي، \\geq أكبر أو يساوي، \\neq لا يساوي.",
    code: String.raw`$a \leq b$ , $a \geq b$ , $a \neq 0$ , $x \to 0^+$ , $\forall x, \exists y$`,
  },
  {
    title: "الحروف اليونانية",
    hint: "اكتب اسم الحرف بعد \\ .",
    code: String.raw`$\alpha, \beta, \gamma, \delta, \varepsilon, \lambda, \mu, \pi, \sigma, \varphi, \omega$`,
  },
  {
    title: "الدوال الشائعة",
    hint: "استخدم \\ln و \\cos و \\sin و \\exp لتظهر بشكل صحيح.",
    code: String.raw`$f : \mathbb{R} \to \mathbb{R}$ , $f(x) = e^x$ , $\ln(x)$ , $\cos^2(x) + \sin^2(x) = 1$`,
  },
  {
    title: "المصفوفات والجمل المعادلية",
    hint: "pmatrix للمصفوفات و cases لجمل المعادلات، و \\\\ للانتقال لسطر جديد.",
    code: String.raw`$$A = \begin{pmatrix} a & b \\ c & d \end{pmatrix} \qquad \begin{cases} x + y = 2 \\ x - y = 0 \end{cases}$$`,
  },
  {
    title: "القوائم",
    hint: "ابدأ السطر برقم ونقطة للقائمة المرقمة، أو بـ - للنقاط (أو استخدم زري 1. و - في الشريط).",
    code: "1. Premiere question\n2. Deuxieme question\n\n- point important\n- autre point",
  },
  {
    title: "الجداول",
    hint: "استخدم زر ⛶ table في الشريط — يفتح لك شبكة تملأها مثل Excel ويُدرج الجدول تلقائيًا.",
    code: String.raw`| $n$ | 0 | 1 | 2 |` + "\n" + String.raw`| --- | --- | --- | --- |` + "\n" + String.raw`| $u_n$ | 1 | 3 | 5 |`,
  },
];

export default function LatexGuidePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">📖 دليل كتابة LaTeX</h1>
      <p className="mt-3 text-muted-foreground">
        LaTeX هي الطريقة المعتمدة عالميًا لكتابة الرموز والمعادلات الرياضية.
        الفكرة بسيطة: تكتب أوامر نصية مثل <code>\frac</code> فتتحول إلى رموز
        جميلة. كل مثال أدناه يعرض ما تكتبه وما سيظهر للقارئ.
      </p>
      <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
        💡 نصيحة: أثناء كتابة مساهمتك، استخدم زر «👁️ معاينة» لترى النتيجة
        فورًا، وأزرار الشريط (B و I و 1. و - و ⛶ table) تكتب الأوامر عنك.
      </div>

      <div className="mt-8 space-y-8">
        {examples.map((ex, idx) => (
          <section key={ex.title}>
            <h2 className="text-lg font-semibold">
              {idx + 1}. {ex.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{ex.hint}</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  ⌨️ تكتب هكذا:
                </p>
                <pre
                  dir="ltr"
                  className="overflow-x-auto whitespace-pre-wrap rounded-md border bg-secondary/40 p-3 text-left font-mono text-sm"
                >
                  {ex.code}
                </pre>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  ✨ فتظهر هكذا:
                </p>
                <div className="rounded-md border bg-card p-3">
                  <MathContent content={ex.code} className="text-sm" />
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10 rounded-lg border bg-card p-5 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">
          جاهز للتجربة؟ افتح صفحة المساهمة واكتب تمرينك الأول — ولا تنس
          زر المعاينة 👁️
        </p>
        <Link
          href="/contribute"
          className="mt-3 inline-block rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          جرّب الآن في صفحة المساهمة 🌱
        </Link>
      </div>
    </div>
  );
}
