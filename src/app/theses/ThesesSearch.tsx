"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo } from "react";
import { instantMeiliSearch } from "@meilisearch/instant-meilisearch";
import {
  Configure,
  InstantSearch,
  useClearRefinements,
  useInfiniteHits,
  useRefinementList,
  useSearchBox,
  useStats,
  useToggleRefinement,
} from "react-instantsearch";
import { BRANCHES, DEGREE_AR } from "@/lib/theses/normalize";

// The proxy exposes Meilisearch under /api/theses/search, so no key ever ships
// to the browser. instant-meilisearch still requires an API key string, hence
// "proxy", which the route ignores.
const PROXY = "/api/theses/search";

// Identical classes to the previous server-rendered page: underlines instead
// of boxes, tiny type, a single filter row. The widgets are rebuilt from
// InstantSearch hooks rather than its default components so the markup and the
// Arabic labels stay exactly the same.
const selectCls =
  "max-w-[42vw] cursor-pointer border-0 border-b border-border bg-transparent px-1 py-1 text-xs text-foreground transition focus:border-primary focus:outline-none sm:max-w-[200px]";
const smallCls =
  "w-24 cursor-pointer border-0 border-b border-border bg-transparent px-1 py-1 text-[11px] text-foreground transition focus:border-primary focus:outline-none";

const ar = (n: number) => n.toLocaleString("ar");

/** Single-value <select> backed by a Meilisearch facet. */
function useSingleFacet(attribute: string, limit = 300, sortBy?: string[]) {
  const { items, refine } = useRefinementList({
    attribute,
    limit,
    sortBy: sortBy as any,
  });
  const current = items.find((i) => i.isRefined)?.value ?? "";
  const select = (next: string) => {
    if (current) refine(current);
    if (next && next !== current) refine(next);
  };
  return { items, current, select };
}

function Header() {
  const { nbHits } = useStats();
  const uni = useRefinementList({ attribute: "uniAr", limit: 200 });
  const pdf = useToggleRefinement({ attribute: "hasPdf", on: true });
  const pdfCount = (pdf.value as any)?.onFacetValue?.count ?? 0;

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h1 className="text-base font-bold">🎓 الأطروحات والمذكّرات</h1>
      <p className="text-[11px] text-muted-foreground">
        {ar(nbHits)} عمل · {uni.items.length} جامعة · {ar(pdfCount)} ملف محفوظ
      </p>
    </div>
  );
}

function Filters() {
  const { query, refine: setQuery } = useSearchBox();
  const uni = useSingleFacet("uniAr", 200);
  const degree = useSingleFacet("degreeAr", 20);
  const branch = useSingleFacet("branchAr", 30);
  const year = useSingleFacet("year", 60, ["name:desc"]);
  const pdf = useToggleRefinement({ attribute: "hasPdf", on: true });
  const clear = useClearRefinements();
  const hasAnyFilter = Boolean(query) || clear.canRefine;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="عنوان، مؤلف، مشرف، كلمة مفتاحية…"
        className="min-w-0 flex-1 border-0 border-b border-border bg-transparent px-1 py-1 text-xs text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary"
      />
      {/* The results already refresh on every keystroke; the button stays for
          muscle memory and simply blurs the field. */}
      <button
        type="button"
        onClick={(e) => (e.currentTarget as HTMLButtonElement).blur()}
        className="rounded-full bg-primary px-4 py-1 text-[11px] font-medium text-primary-foreground transition hover:opacity-90"
      >
        🔍 بحث
      </button>

      <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2">
        <select
          value={uni.current}
          onChange={(e) => uni.select(e.target.value)}
          className={selectCls}
          aria-label="الجامعة"
        >
          <option value="">🏛️ كل الجامعات</option>
          {uni.items.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label} ({u.count})
            </option>
          ))}
        </select>

        <select
          value={degree.current}
          onChange={(e) => degree.select(e.target.value)}
          className={smallCls}
          aria-label="الدرجة"
        >
          <option value="">🎓 الدرجة</option>
          {Object.entries(DEGREE_AR).map(([k, v]) => (
            <option key={k} value={v}>
              {v}
            </option>
          ))}
        </select>

        <select
          value={branch.current}
          onChange={(e) => branch.select(e.target.value)}
          className={selectCls}
          aria-label="الفرع"
        >
          <option value="">🧭 كل الفروع</option>
          {BRANCHES.map((b) => (
            <option key={b.key} value={b.ar}>
              {b.ar}
            </option>
          ))}
          <option value="غير مصنّف">غير مصنّف</option>
        </select>

        <select
          value={year.current}
          onChange={(e) => year.select(e.target.value)}
          className={smallCls}
          aria-label="السنة"
        >
          <option value="">📅 السنة</option>
          {year.items.map((y) => (
            <option key={y.value} value={y.value}>
              {y.label} ({y.count})
            </option>
          ))}
        </select>

        <label className="flex cursor-pointer items-center gap-1 text-[11px] text-muted-foreground">
          <input
            type="checkbox"
            checked={pdf.value.isRefined}
            onChange={() => pdf.refine({ isRefined: pdf.value.isRefined })}
            className="h-3 w-3 cursor-pointer accent-primary"
          />
          ⬇️ ملف محفوظ فقط
        </label>

        {hasAnyFilter && (
          <button
            type="button"
            onClick={() => {
              clear.refine();
              setQuery("");
            }}
            className="text-[11px] text-muted-foreground transition hover:text-destructive"
          >
            ✕ مسح
          </button>
        )}
      </div>
    </div>
  );
}

function Hits() {
  const { items, isLastPage, showMore } = useInfiniteHits<Record<string, any>>();
  const { nbHits } = useStats();

  if (items.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        لا توجد نتائج. جرّب كلمات أقل أو أزل بعض الفلاتر.
      </p>
    );
  }

  return (
    <>
      <p className="mt-3 text-[11px] text-muted-foreground">
        عرض {ar(1)}–{ar(items.length)} من {ar(nbHits)}
      </p>

      {/* صفوف مضغوطة بفواصل رفيعة بدل البطاقات */}
      <div className="mt-1 divide-y">
        {items.map((t) => {
          const id = String(t.id ?? t.objectID ?? "");
          const href = "/api/theses/pdf?id=" + encodeURIComponent(id);
          const saved = Boolean(t.hasPdf);
          const authors: string[] = Array.isArray(t.authors) ? t.authors : [];
          const supervisors: string[] = Array.isArray(t.supervisors)
            ? t.supervisors
            : [];
          return (
            <div key={id} className="group flex items-start gap-3 py-3">
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

                {authors.length > 0 && (
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground/70">
                    {authors.join(" · ")}
                    {supervisors.length > 0 &&
                      " — إشراف: " + supervisors.join(" · ")}
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

      {!isLastPage && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={showMore}
            className="rounded-full border px-4 py-1 text-xs transition hover:border-primary hover:text-primary"
          >
            عرض المزيد ↓
          </button>
        </div>
      )}
    </>
  );
}

export default function ThesesSearch() {
  const searchClient = useMemo(() => {
    const { searchClient } = instantMeiliSearch(PROXY, "proxy", {
      primaryKey: "id",
      finitePagination: false,
    } as any);
    return searchClient as any;
  }, []);

  return (
    <InstantSearch indexName="theses" searchClient={searchClient}>
      <Configure hitsPerPage={20} />
      <Header />
      <Filters />
      <div className="mt-4 h-px bg-gradient-to-l from-primary/40 via-border to-transparent" />
      <Hits />
    </InstantSearch>
  );
}
