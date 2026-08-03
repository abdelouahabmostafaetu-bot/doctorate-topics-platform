import Link from "next/link";
import { thesesCol } from "@/lib/theses/db";
import { BRANCHES, DEGREE_AR, norm } from "@/lib/theses/normalize";
import { REPOS, supportsDirectPdf } from "@/lib/theses/repos";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "أطروحات ومذكّرات الرياضيات في الجزائر",
  description:
    "محرّك بحث موحّد لأطروحات ومذكّرات الرياضيات من المستودعات الرقمية للجامعات الجزائرية.",
};

const PAGE_SIZE = 20;

type SP = Record<string, string | string[] | undefined>;

function one(sp: SP, k: string): string {
  const v = sp[k];
  return (Array.isArray(v) ? v[0] : v) || "";
}

export default async function ThesesPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const q = one(sp, "q").trim();
  const uni = one(sp, "uni");
  const degree = one(sp, "degree");
  const branch = one(sp, "branch");
  const year = one(sp, "year");
  const page = Math.max(1, Number(one(sp, "page") || 1));

  const filter: Record<string, unknown> = { status: "ok" };
  if (uni) filter.uniSlug = uni;
  if (degree) filter.degree = degree;
  if (branch) filter.branch = branch;
  if (year) filter.year = Number(year);
  if (q) {
    const terms = norm(q).split(" ").filter((t) => t.length > 1).slice(0, 6);
    if (terms.length) {
      filter.$and = terms.map((t) => ({
        st: { $regex: t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") },
      }));
    }
  }

  const col = await thesesCol();
  const [total, rows, uniFacet, yearFacet] = await Promise.all([
    col.countDocuments(filter),
    col
      .find(filter)
      .sort({ year: -1, _id: 1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .toArray(),
    col
      .aggregate([
        { $match: { status: "ok" } },
        { $group: { _id: "$uniSlug", n: { $sum: 1 }, ar: { $first: "$uniAr" } } },
        { $sort: { n: -1 } },
      ])
      .toArray(),
    col
      .aggregate([
        { $match: { status: "ok", year: { $ne: null } } },
        { $group: { _id: "$year", n: { $sum: 1 } } },
        { $sort: { _id: -1 } },
        { $limit: 30 },
      ])
      .toArray(),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const grandTotal = uniFacet.reduce((a, u) => a + (u.n as number), 0);

  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams();
    const base: Record<string, string> = { q, uni, degree, branch, year };
    for (const [k, v] of Object.entries({ ...base, ...patch })) {
      if (v) p.set(k, v);
    }
    const s = p.toString();
    return "/theses" + (s ? "?" + s : "");
  };

  const selectCls =
    "h-10 rounded-lg border border-border bg-card px-2 text-xs text-foreground outline-none transition focus:border-primary";

  return (
    <main dir="rtl" className="mx-auto w-full max-w-5xl px-4 py-10">
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          أطروحات ومذكّرات الرياضيات
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {grandTotal.toLocaleString("ar")} عملًا من {uniFacet.length} جامعة جزائرية
        </p>
      </header>

      <form action="/theses" method="get" className="mb-6">
        <div className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="ابحث بعنوان، مؤلف، مشرف، أو كلمة مفتاحية…"
            className="h-12 flex-1 rounded-xl border border-border bg-card px-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary"
          />
          <button
            type="submit"
            className="h-12 shrink-0 rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            بحث
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <select name="uni" defaultValue={uni} className={selectCls}>
            <option value="">كل الجامعات</option>
            {uniFacet.map((u) => {
              const r = REPOS.find((x) => x.slug === u._id);
              return (
                <option key={String(u._id)} value={String(u._id)}>
                  {(u.ar as string) || r?.nameAr || String(u._id)} ({u.n as number})
                </option>
              );
            })}
          </select>

          <select name="degree" defaultValue={degree} className={selectCls}>
            <option value="">كل الدرجات</option>
            {Object.entries(DEGREE_AR).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          <select name="branch" defaultValue={branch} className={selectCls}>
            <option value="">كل الفروع</option>
            {BRANCHES.map((b) => (
              <option key={b.key} value={b.key}>
                {b.ar}
              </option>
            ))}
            <option value="other">غير مصنّف</option>
          </select>

          <select name="year" defaultValue={year} className={selectCls}>
            <option value="">كل السنوات</option>
            {yearFacet.map((y) => (
              <option key={String(y._id)} value={String(y._id)}>
                {String(y._id)} ({y.n as number})
              </option>
            ))}
          </select>
        </div>
      </form>

      <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>{total.toLocaleString("ar")} نتيجة</span>
        {(q || uni || degree || branch || year) && (
          <Link href="/theses" className="transition hover:text-primary">
            مسح الفلاتر
          </Link>
        )}
      </div>

      <ul className="space-y-3">
        {rows.map((t) => (
          <li
            key={t._id}
            className="rounded-xl border border-border bg-card p-4 transition hover:border-primary/40"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span className="rounded-md bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
                {t.degreeAr}
              </span>
              {t.branch !== "other" && (
                <span className="rounded-md bg-muted px-2 py-0.5">{t.branchAr}</span>
              )}
              <span>{t.uniAr}</span>
              {t.year && <span>· {t.year}</span>}
            </div>

            <h2 className="text-sm font-semibold leading-relaxed text-foreground">
              {t.title}
            </h2>

            {t.authors.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t.authors.join(" · ")}
              </p>
            )}
            {t.supervisors.length > 0 && (
              <p className="mt-0.5 text-xs text-muted-foreground/70">
                إشراف: {t.supervisors.join(" · ")}
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {supportsDirectPdf(t.uniSlug) && (
                <a
                  href={"/api/theses/pdf?id=" + encodeURIComponent(String(t._id))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition hover:opacity-90"
                >
                  ⬇️ تحميل PDF
                </a>
              )}
              <a
                href={t.landingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-xs font-medium text-foreground transition hover:border-primary hover:text-primary"
              >
                🔗 المصدر الأصلي
              </a>
            </div>
          </li>
        ))}
      </ul>

      {rows.length === 0 && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          لا توجد نتائج. جرّب كلمات أقل أو أزل بعض الفلاتر.
        </p>
      )}

      {pages > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-3 text-xs">
          {page > 1 && (
            <Link
              href={qs({ page: String(page - 1) })}
              className="rounded-lg border border-border px-3 py-2 text-foreground transition hover:border-primary hover:text-primary"
            >
              السابق
            </Link>
          )}
          <span className="text-muted-foreground">
            {page} / {pages}
          </span>
          {page < pages && (
            <Link
              href={qs({ page: String(page + 1) })}
              className="rounded-lg border border-border px-3 py-2 text-foreground transition hover:border-primary hover:text-primary"
            >
              التالي
            </Link>
          )}
        </nav>
      )}

      <footer className="mt-12 border-t border-border pt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
        البيانات الوصفية محصودة عبر OAI-PMH وواجهات REST من المستودعات الرقمية
        المفتوحة للجامعات الجزائرية. حقوق الأعمال محفوظة لأصحابها وجامعاتها، والملفات
        تبقى مستضافة على خوادم الجامعات.
      </footer>
    </main>
  );
}
