import Link from "next/link";
import { thesesCol } from "@/lib/theses/db";
import { BRANCHES, DEGREE_AR, norm } from "@/lib/theses/normalize";
import { REPOS } from "@/lib/theses/repos";

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

// نفس أسلوب صفحة المواضيع: خط سفلي بدل الصناديق، وكتابة صغيرة
const selectCls =
  "max-w-[42vw] cursor-pointer border-0 border-b border-border bg-transparent px-1 py-1 text-xs text-foreground transition focus:border-primary focus:outline-none sm:max-w-[200px]";
const smallCls =
  "w-24 cursor-pointer border-0 border-b border-border bg-transparent px-1 py-1 text-[11px] text-foreground transition focus:border-primary focus:outline-none";

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
  const pdf = one(sp, "pdf");
  const page = Math.max(1, Number(one(sp, "page") || 1));

  // Un PDF deja resolu = chaine non vide. { $gt: "" } exclut naturellement null
  // et le champ absent (ordre des types BSON), et reste type-safe cote driver.
  const HAS_PDF = { pdfUrl: { $gt: "" } } as const;

  const filter: Record<string, unknown> = { status: "ok" };
  if (uni) filter.uniSlug = uni;
  if (degree) filter.degree = degree;
  if (branch) filter.branch = branch;
  if (year) filter.year = Number(year);
  if (pdf) filter.pdfUrl = { $gt: "" };
  if (q) {
    const terms = norm(q).split(" ").filter((t) => t.length > 1).slice(0, 6);
    if (terms.length) {
      filter.$and = terms.map((t) => ({
        st: { $regex: t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") },
      }));
    }
  }

  const col = await thesesCol();
  const [total, rows, uniFacet, yearFacet, pdfCount] = await Promise.all([
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
    col.countDocuments({ status: "ok", ...HAS_PDF }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const grandTotal = uniFacet.reduce((a, u) => a + (u.n as number), 0);
  const hasAnyFilter = Boolean(q || uni || degree || branch || year || pdf);

  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams();
    const base: Record<string, string> = { q, uni, degree, branch, year, pdf };
    for (const [k, v] of Object.entries({ ...base, ...patch })) {
      if (v) p.set(k, v);
    }
    const s = p.toString();
    return "/theses" + (s ? "?" + s : "");
  };

  return (
    <div dir="rtl" className="mx-auto max-w-3xl px-4 py-8">
      {/* رأس صغير على سطر واحد */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-base font-bold">🎓 الأطروحات والمذكّرات</h1>
        <p className="text-[11px] text-muted-foreground">
          {grandTotal.toLocaleString("ar")} عمل · {uniFacet.length} جامعة ·{" "}
          {pdfCount.toLocaleString("ar")} ملف محفوظ
        </p>
      </div>

      {/* بحث + فلاتر بخط سفلي بدون صناديق */}
      <form
        action="/theses"
        method="get"
        className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2"
      >
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="عنوان، مؤلف، مشرف، كلمة مفتاحية…"
          className="min-w-0 flex-1 border-0 border-b border-border bg-transparent px-1 py-1 text-xs text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary"
        />
        <button
          type="submit"
          className="rounded-full bg-primary px-4 py-1 text-[11px] font-medium text-primary-foreground transition hover:opacity-90"
        >
          🔍 بحث
        </button>

        <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2">
          <select name="uni" defaultValue={uni} className={selectCls} aria-label="الجامعة">
            <option value="">🏛️ كل الجامعات</option>
            {uniFacet.map((u) => {
              const r = REPOS.find((x) => x.slug === u._id);
              return (
                <option key={String(u._id)} value={String(u._id)}>
                  {(u.ar as string) || r?.nameAr || String(u._id)} ({u.n as number})
                </option>
              );
            })}
          </select>

          <select name="degree" defaultValue={degree} className={smallCls} aria-label="الدرجة">
            <option value="">🎓 الدرجة</option>
            {Object.entries(DEGREE_AR).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          <select name="branch" defaultValue={branch} className={selectCls} aria-label="الفرع">
            <option value="">🧭 كل الفروع</option>
            {BRANCHES.map((b) => (
              <option key={b.key} value={b.key}>
                {b.ar}
              </option>
            ))}
            <option value="other">غير مصنّف</option>
          </select>

          <select name="year" defaultValue={year} className={smallCls} aria-label="السنة">
            <option value="">📅 السنة</option>
            {yearFacet.map((y) => (
              <option key={String(y._id)} value={String(y._id)}>
                {String(y._id)} ({y.n as number})
              </option>
            ))}
          </select>

          <label className="flex cursor-pointer items-center gap-1 text-[11px] text-muted-foreground">
            <input
              type="checkbox"
              name="pdf"
              value="1"
              defaultChecked={Boolean(pdf)}
              className="h-3 w-3 cursor-pointer accent-primary"
            />
            ⬇️ ملف محفوظ فقط
          </label>

          {hasAnyFilter && (
            <Link
              href="/theses"
              className="text-[11px] text-muted-foreground transition hover:text-destructive"
            >
              ✕ مسح
            </Link>
          )}
        </div>
      </form>

      <div className="mt-4 h-px bg-gradient-to-l from-primary/40 via-border to-transparent" />

      {rows.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          لا توجد نتائج. جرّب كلمات أقل أو أزل بعض الفلاتر.
        </p>
      ) : (
        <>
          <p className="mt-3 text-[11px] text-muted-foreground">
            عرض {((page - 1) * PAGE_SIZE + 1).toLocaleString("ar")}–
            {((page - 1) * PAGE_SIZE + rows.length).toLocaleString("ar")} من{" "}
            {total.toLocaleString("ar")}
          </p>

          {/* صفوف مضغوطة بفواصل رفيعة بدل البطاقات */}
          <div className="mt-1 divide-y">
            {rows.map((t) => {
              // زر التحميل متاح دائماً: إن لم يكن الرابط محفوظاً يستخرجه الخادم
              // من صفحة المستودع عند الضغط، وإن تعذّر يحوّل إلى صفحة الجامعة.
              const href =
                "/api/theses/pdf?id=" + encodeURIComponent(String(t._id));
              const saved = Boolean(t.pdfUrl);
              return (
                <div key={t._id} className="group flex items-start gap-3 py-3">
                  <span className="w-11 shrink-0 pt-0.5 text-center text-xs font-bold text-primary">
                    {t.year || "—"}
                  </span>

                  <div className="min-w-0 flex-1">
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm font-medium leading-relaxed transition group-hover:text-primary"
                    >
                      {t.title}
                    </a>

                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {t.degreeAr}
                      {t.branch !== "other" && " · " + t.branchAr}
                      {" · "}
                      {t.uniAr}
                    </p>

                    {t.authors.length > 0 && (
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground/70">
                        {t.authors.join(" · ")}
                        {t.supervisors.length > 0 &&
                          " — إشراف: " + t.supervisors.join(" · ")}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2 pt-0.5 text-[11px]">
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={
                        saved
                          ? "text-primary transition hover:opacity-70"
                          : "text-primary/70 transition hover:opacity-70"
                      }
                      title={saved ? "تحميل PDF" : "تحميل PDF (يُستخرج عند الطلب)"}
                    >
                      ⬇️ PDF
                    </a>
                    <a
                      href={t.landingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground transition hover:text-primary"
                      title="المصدر الأصلي"
                    >
                      🔗
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {pages > 1 && (
            <nav className="mt-6 flex items-center justify-center gap-3 text-xs">
              {page > 1 && (
                <Link
                  href={qs({ page: String(page - 1) })}
                  className="rounded-full border px-3 py-1 transition hover:border-primary hover:text-primary"
                >
                  → السابق
                </Link>
              )}
              <span className="text-muted-foreground">
                {page} / {pages}
              </span>
              {page < pages && (
                <Link
                  href={qs({ page: String(page + 1) })}
                  className="rounded-full border px-3 py-1 transition hover:border-primary hover:text-primary"
                >
                  التالي ←
                </Link>
              )}
            </nav>
          )}
        </>
      )}

      <footer className="mt-10 border-t border-border pt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
        البيانات الوصفية محصودة عبر OAI-PMH وواجهات REST من المستودعات الرقمية
        المفتوحة للجامعات الجزائرية. حقوق الأعمال محفوظة لأصحابها وجامعاتها،
        والملفات تبقى مستضافة على خوادم الجامعات.
      </footer>
    </div>
  );
}
