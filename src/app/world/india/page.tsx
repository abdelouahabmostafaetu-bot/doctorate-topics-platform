import Link from "next/link";
import type { Metadata } from "next";
import { ExternalLink, FileText, Landmark, Search } from "lucide-react";

export const metadata: Metadata = {
  title: "الهند — آفاق",
  description:
    "مصادر رسمية لمواضيع اختبارات القبول في دكتوراه الرياضيات بالجامعات الهندية.",
};

const sources = [
  {
    university: "جامعة مهاتما غاندي",
    universityEn: "Mahatma Gandhi University",
    description:
      "أرشيف رسمي للمواضيع السابقة لاختبار دخول الدكتوراه، ويتضمن قسم الرياضيات.",
    href: "https://research.mgu.ac.in/downloads/previous-year-ph-d-entrance-question-paper/",
    label: "فتح أرشيف الرياضيات",
  },
  {
    university: "جامعة كيرالا",
    universityEn: "University of Kerala",
    description:
      "صفحة رسمية تجمع أوراق اختبارات دخول الدكتوراه السابقة حسب الكلية والتخصص والسنة.",
    href: "https://research.keralauniversity.ac.in/assets/pdf/qp.html",
    label: "تصفّح الأوراق السابقة",
  },
  {
    university: "جامعة سري أوروبندو",
    universityEn: "Sri Aurobindo University",
    description:
      "برنامج دكتوراه في الرياضيات يعتمد اختبار دخول من 50 سؤالًا متعدد الخيارات خلال ساعتين.",
    href: "https://sau.int/phd-in-mathematics/",
    label: "عرض تفاصيل الاختبار",
  },
] as const;

export default function IndiaPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12" dir="rtl">
      <nav className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <Link href="/world" className="transition hover:text-primary">
          آفاق
        </Link>
        <span aria-hidden>/</span>
        <span>الهند</span>
      </nav>

      <header className="mt-5 border-b pb-7">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border bg-secondary/40 text-3xl" aria-hidden>
            🇮🇳
          </span>
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] text-primary">
              INDIA · PHD MATHEMATICS
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              اختبارات دكتوراه الرياضيات في الهند
            </h1>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
          مصادر جامعية رسمية لمواضيع ونماذج اختبارات القبول في الدكتوراه. نعرض المصدر الأصلي أولًا، ثم نضيف الأوراق المراجعة إلى أرشيف DocMath تدريجيًا.
        </p>
      </header>

      <section className="mt-7" aria-labelledby="official-sources">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold text-primary">مصادر موثوقة</p>
            <h2 id="official-sources" className="mt-1 text-lg font-bold">
              الأرشيفات الرسمية
            </h2>
          </div>
          <span className="rounded-full border px-3 py-1 text-[10px] text-muted-foreground">
            {sources.length} جامعات ومصادر أولية
          </span>
        </div>

        <div className="mt-4 divide-y border-y">
          {sources.map((source) => (
            <article key={source.href} className="grid gap-4 py-5 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="flex gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Landmark className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <h3 className="text-sm font-bold">{source.university}</h3>
                  <p className="mt-0.5 text-[10px] text-muted-foreground" dir="ltr">
                    {source.universityEn}
                  </p>
                  <p className="mt-2 max-w-2xl text-xs leading-6 text-muted-foreground">
                    {source.description}
                  </p>
                </div>
              </div>
              <a
                href={source.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 text-xs font-semibold transition hover:border-primary hover:text-primary"
              >
                {source.label}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <FileText className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="mt-3 text-xs font-bold">أوراق رسمية فقط</h2>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            لا نضيف ملفات مجهولة الجامعة أو السنة.
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <Search className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="mt-3 text-xs font-bold">مراجعة قبل النشر</h2>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            نتحقق من التخصص والمصدر ومحتوى كل ورقة.
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <Landmark className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="mt-3 text-xs font-bold">تنظيم حسب الجامعة</h2>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            ستظهر الأوراق لاحقًا بالسنة والتخصص والجامعة.
          </p>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t pt-6">
        <Link href="/world" className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground transition hover:opacity-90">
          العودة إلى آفاق
        </Link>
        <Link href="/contribute" className="inline-flex min-h-11 items-center rounded-lg border px-4 text-xs font-semibold transition hover:border-primary hover:text-primary">
          أرسل ورقة هندية موثوقة
        </Link>
      </div>
    </main>
  );
}
