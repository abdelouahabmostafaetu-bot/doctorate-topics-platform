import Link from "next/link";

export const metadata = {
  title: "دليل LaTeX — منصة مواضيع دكتوراه الرياضيات",
};

const lessons = [
  { t: "معادلة سطرية", e: "$x^2 + y^2 = z^2$" },
  { t: "معادلة كتلة", e: "$$\\int_0^1 x^2\\,dx = \\frac{1}{3}$$" },
  { t: "كسور", e: "$\\frac{a}{b}$" },
  { t: "جذر", e: "$\\sqrt{x}$ و $\\sqrt[n]{x}$" },
  { t: "أسس وفهارس", e: "$x^{n+1}$ و $a_i$" },
  { t: "مجموع وتكامل", e: "$\\sum_{k=1}^{n} k$ و $\\int_a^b f$" },
  { t: "نهايات", e: "$\\lim_{x\\to 0} \\frac{\\sin x}{x}$" },
  { t: "مصفوفات بسيطة", e: "$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$" },
  { t: "يوناني", e: "$\\alpha,\\beta,\\gamma,\\delta,\\varepsilon,\\lambda,\\mu,\\pi,\\sigma,\\omega$" },
  { t: "متباينات", e: "$x \\leq y \\quad x \\geq y \\quad x \\neq y$" },
  { t: "مجموعة", e: "$x \\in \\mathbb{R}$ و $A \\subset B$" },
  { t: "نص داخل معادلة", e: "$x = 0 \\text{ إذا كان } y > 1$" },
  { t: "اشتقاق", e: "$f'(x)$ أو $\\frac{df}{dx}$" },
  { t: "قيمة مطلقة", e: "$|x|$ أو $\\left| \\frac{a}{b} \\right|$" },
  { t: "أقواس كبيرة", e: "$\\left( \\frac{a}{b} \\right)$" },
  { t: "نقاط", e: "$x_1, x_2, \\ldots, x_n$" },
];

export default function LatexGuidePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">كيف أكتب بـ LaTeX؟</h1>
      <p className="mt-2 text-muted-foreground">
        أمثلة سريعة لكتابة التمارين. ضع المعادلات بين $ ... $ أو $$ ... $$.
      </p>
      <div className="mt-6 space-y-3">
        {lessons.map((l) => (
          <div key={l.t} className="rounded-lg border bg-card p-4">
            <div className="font-medium">{l.t}</div>
            <pre className="mt-2 overflow-x-auto rounded bg-secondary/40 p-2 text-sm" dir="ltr">
              {l.e}
            </pre>
          </div>
        ))}
      </div>
      <p className="mt-8 text-center">
        <Link href="/contribute" className="text-primary hover:underline">
          ← العودة لصفحة المساهمة
        </Link>
      </p>
    </div>
  );
}
