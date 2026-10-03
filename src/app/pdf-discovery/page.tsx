import Link from "next/link";
import type { Metadata } from "next";
import {
  type FessPdfKind,
  type FessPdfResult,
  searchFessPdfs,
} from "@/lib/fess";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "مكتشف ملفات PDF الرياضية",
  description:
    "اكتشف ملفات PDF الرسمية للاختبارات والمسابقات والحلول الرياضية من الأرشيفات الجامعية حول العالم.",
};

type SearchParams = {
  q?: string;
  kind?: string;
  domain?: string;
  page?: string;
};

const PAGE_SIZE = 30;
const selectClass =
  "max-w-[44vw] cursor-pointer border-0 border-b border-border bg-transparent px-1 py-1 text-xs text-foreground transition focus:border-primary focus:outline-none sm:max-w-[220px]";

const KIND_LABELS: Record<FessPdfKind, string> = {
  exam: "اختبار أو مسائل",
  solution: "حلول وإجابات",
  results: "نتائج",
  other: "ملف رياضي",
};

function resultHref(item: FessPdfResult) {
  return item.url;
}

export default async function PdfDiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const requestedPage = Math.max(1, Number.parseInt(sp.page || "1", 10) || 1);
  const requestedKind = (sp.kind || "") as FessPdfKind | "";
  const response = await searchFessPdfs({
    query: sp.q,
    start: (requestedPage - 1) * PAGE_SIZE,
    size: PAGE_SIZE,
  });

  const domains = [...new Set(response.results.map((item) => item.domain))].sort();
  const results = response.results.filter((item) => {
    if (requestedKind && item.kind !== requestedKind) return false;
    if (sp.domain && item.domain !== sp.domain) return false;
    return true;
  });
  const verified = results.filter(
    (item) => item.confidence === "verified",
  ).length;
  const totalPages = Math.max(1, Math.ceil(response.total / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const hasFilters = Boolean(sp.q || sp.kind || sp.domain);
  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    if (sp.q) params.set("q", sp.q);
    if (sp.kind) params.set("kind", sp.kind);
    if (sp.domain) params.set("domain", sp.domain);
    params.set("page", String(page));
    return `/pdf-discovery?${params.toString()}`;
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8" dir="rtl">
      <Link
        href="/"
        className="block text-[11px] text-muted-foreground transition hover:text-primary"
      >
        → الصفحة الرئيسية
      </Link>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-base font-bold">🔎 مكتشف ملفات PDF الرياضية</h1>
          <p className="mt-1 max-w-2xl text-[11px] leading-5 text-muted-foreground">
            بحث دقيق داخل ملفات PDF التي اكتشفها محرك الزحف من المصادر الرسمية
            للجامعات والمسابقات حول العالم.
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {response.available
            ? `${response.total} ملف مفهرس`
            : "المحرك غير متاح"}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-y py-3 text-[10px] text-muted-foreground">
        <span>
          <strong className="text-sm text-foreground">{results.length}</strong>{" "}
          نتيجة في الصفحة
        </span>
        <span>
          <strong className="text-sm text-foreground">{verified}</strong> تحقق
          مزدوج
        </span>
        <span>
          <strong className="text-sm text-foreground">{domains.length}</strong>{" "}
          مصدر
        </span>
        {response.tookMs !== null && <span>{response.tookMs} ms</span>}
      </div>

      <form method="get" action="/pdf-discovery" className="mt-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <input
            name="q"
            defaultValue={sp.q || ""}
            placeholder="ابحث باسم الجامعة، المادة أو السنة…"
            className="min-w-[220px] flex-1 border-0 border-b border-border bg-transparent px-1 py-1 text-xs outline-none transition placeholder:text-muted-foreground focus:border-primary"
          />
          <select
            name="kind"
            defaultValue={sp.kind || ""}
            className={selectClass}
            aria-label="نوع الملف"
          >
            <option value="">📄 كل ملفات PDF</option>
            {Object.entries(KIND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            name="domain"
            defaultValue={sp.domain || ""}
            className={selectClass}
            aria-label="المصدر"
          >
            <option value="">🌐 كل المصادر</option>
            {domains.map((domain) => (
              <option key={domain} value={domain}>
                {domain}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-full bg-primary px-4 py-1 text-[11px] font-medium text-primary-foreground transition hover:opacity-90"
          >
            🔍 بحث
          </button>
          {hasFilters && (
            <Link
              href="/pdf-discovery"
              className="text-[11px] text-muted-foreground transition hover:text-destructive"
            >
              ✕ مسح
            </Link>
          )}
        </div>
      </form>

      <div className="mt-4 h-px bg-gradient-to-l from-primary/40 via-border to-transparent" />

      {!response.available ? (
        <div className="py-16 text-center">
          <p className="text-sm font-semibold">محرك الاكتشاف غير متاح مؤقتًا</p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {response.error || "أعد المحاولة بعد قليل."}
          </p>
        </div>
      ) : results.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          لا توجد ملفات PDF مطابقة — جرّب كلمات أقل أو امسح بعض الفلاتر.
        </p>
      ) : (
        <>
          <div className="mt-1 divide-y">
            {results.map((item) => (
              <a
                key={`${item.id}-${item.url}`}
                href={resultHref(item)}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3 py-4"
              >
                <span className="w-14 shrink-0 pt-0.5 text-center">
                  <span className="block text-sm font-bold text-primary">
                    PDF
                  </span>
                  <span className="text-[9px] font-semibold text-muted-foreground">
                    {item.confidence === "verified" ? "مؤكد" : "مرجح"}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-6 transition group-hover:text-primary">
                    {item.title}
                  </span>
                  <span
                    dir="ltr"
                    className="mt-0.5 block truncate text-left text-[10px] text-muted-foreground"
                  >
                    {item.displayUrl}
                  </span>
                  <span className="mt-1 block text-[10px] text-muted-foreground">
                    {KIND_LABELS[item.kind]} · {item.domain} ·{" "}
                    {item.confidence === "verified"
                      ? "الرابط والبيانات يؤكدان PDF"
                      : "مرشح PDF من الفهرس"}
                  </span>
                  {item.description && (
                    <span className="mt-1 line-clamp-2 block text-[10px] leading-5 text-muted-foreground">
                      {item.description}
                    </span>
                  )}
                </span>
                <span className="shrink-0 pt-1 text-xs text-muted-foreground transition group-hover:-translate-x-0.5 group-hover:text-primary">
                  ↗
                </span>
              </a>
            ))}
          </div>

          {totalPages > 1 && (
            <nav
              className="mt-6 flex items-center justify-between border-t pt-4 text-xs"
              aria-label="صفحات النتائج"
            >
              {currentPage > 1 ? (
                <Link
                  href={pageHref(currentPage - 1)}
                  className="rounded-full border px-3 py-1.5 transition hover:border-primary hover:text-primary"
                >
                  → السابق
                </Link>
              ) : (
                <span />
              )}
              <span className="text-muted-foreground">
                صفحة {currentPage} من {totalPages}
              </span>
              {currentPage < totalPages ? (
                <Link
                  href={pageHref(currentPage + 1)}
                  className="rounded-full border px-3 py-1.5 transition hover:border-primary hover:text-primary"
                >
                  التالي ←
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}

      <p className="mt-6 border-t pt-4 text-[10px] leading-5 text-muted-foreground">
        الدقة أولًا: لا يعرض الموقع إلا النتائج التي تحمل امتداد PDF أو تعرّف
        عنها المصدر كملف PDF. يبقى الملف مستضافًا لدى صاحبه الرسمي ولا تُنسخ
        محتوياته إلى DocMath DZ.
      </p>
    </div>
  );
}