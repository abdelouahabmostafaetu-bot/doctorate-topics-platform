"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import { instantMeiliSearch } from "@meilisearch/instant-meilisearch";
import {
  Configure,
  InstantSearch,
  useClearRefinements,
  useHits,
  useInstantSearch,
  usePagination,
  useRefinementList,
  useSearchBox,
  useStats,
  useToggleRefinement,
} from "react-instantsearch";
import { BRANCHES, DEGREE_AR } from "@/lib/theses/normalize";

// The proxy exposes Meilisearch under /api/theses/search, so no key ever ships
// to the browser. meilisearch-js parses the host with `new URL(...)`, which
// rejects relative paths, hence the origin prefix at call time.
const PROXY_PATH = "/api/theses/search";

function proxyHost(): string {
  if (typeof window === "undefined") return "http://localhost:3000" + PROXY_PATH;
  return window.location.origin + PROXY_PATH;
}

// Abstracts are several kilobytes each and are never rendered in the list, so
// asking for them would make every keystroke download ~200x more data than the
// rows actually need. Only the displayed fields are requested.
const RETRIEVE = [
  "id",
  "title",
  "authors",
  "supervisors",
  "year",
  "degreeAr",
  "branch",
  "branchAr",
  "uniAr",
  "landingUrl",
  "hasPdf",
];

// One page of rows. Kept as a constant because the range label ("عرض 21–40")
// has to know the page size without waiting for a response.
const HITS_PER_PAGE = 20;

// How many numbered pages are shown on each side of the current one.
const PAGE_PADDING = 2;

/** Meilisearch ids lose ':' and '/', so the landing URL travels along as a
 *  lossless key the PDF route can fall back on. */
function pdfHref(id: string, landingUrl: string): string {
  const u = landingUrl ? "&u=" + encodeURIComponent(landingUrl) : "";
  return "/api/theses/pdf?id=" + encodeURIComponent(id) + u;
}

// Identical classes to the previous server-rendered page: underlines instead
// of boxes, tiny type, a single filter row. The widgets are rebuilt from
// InstantSearch hooks rather than its default components so the markup and the
// Arabic labels stay exactly the same.
const selectCls =
  "max-w-[42vw] cursor-pointer border-0 border-b border-border bg-transparent px-1 py-1 text-xs text-foreground transition focus:border-primary focus:outline-none sm:max-w-[200px]";
const smallCls =
  "w-24 cursor-pointer border-0 border-b border-border bg-transparent px-1 py-1 text-[11px] text-foreground transition focus:border-primary focus:outline-none";

// Pagination chips. Page numbers stay in Latin digits so they read the same as
// the URL, while counts keep the Arabic locale formatting used elsewhere.
const pageBtn =
  "min-w-[1.9rem] rounded-full border px-2.5 py-1 text-center transition hover:border-primary hover:text-primary";
const pageBtnActive =
  "min-w-[1.9rem] rounded-full border border-primary bg-primary px-2.5 py-1 text-center font-bold text-primary-foreground";
const pageBtnOff =
  "min-w-[1.9rem] cursor-not-allowed rounded-full border px-2.5 py-1 text-center opacity-40";

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
  const uni = useRefinementList({ attribute: "uniAr", limit: 100 });
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

/** Search failures are otherwise silent and look like "no results". */
function ErrorNotice() {
  const { error } = useInstantSearch();
  if (!error) return null;
  return (
    <p className="mt-2 text-[11px] text-destructive">
      تعذّر الاتصال بمحرّك البحث: {error.message}
    </p>
  );
}

function Filters() {
  const { query, refine: setQuery } = useSearchBox();
  const [text, setText] = useState(query);
  const uni = useSingleFacet("uniAr", 100);
  const degree = useSingleFacet("degreeAr", 20);
  const branch = useSingleFacet("branchAr", 20);
  const year = useSingleFacet("year", 60, ["name:desc"]);
  const pdf = useToggleRefinement({ attribute: "hasPdf", on: true });
  const clear = useClearRefinements();
  const hasAnyFilter = Boolean(text) || clear.canRefine;

  // Typing stays instant locally while the network sees one request per pause,
  // which keeps the small Meilisearch instance responsive on long queries.
  useEffect(() => {
    if (text === query) return;
    const t = setTimeout(() => setQuery(text), 120);
    return () => clearTimeout(t);
  }, [text, query, setQuery]);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="عنوان، مؤلف، مشرف، كلمة مفتاحية…"
        className="min-w-0 flex-1 border-0 border-b border-border bg-transparent px-1 py-1 text-xs text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary"
      />
      {/* The results already refresh while typing; the button stays for muscle
          memory and simply commits the current text immediately. */}
      <button
        type="button"
        onClick={() => setQuery(text)}
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
              setText("");
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

/** Numbered pages: ⟨السابق⟩ 1 … 4 5 [6] 7 8 … 20 ⟨التالي⟩. */
function Pagination() {
  const {
    pages,
    currentRefinement,
    nbPages,
    isFirstPage,
    isLastPage,
    refine,
  } = usePagination({ padding: PAGE_PADDING });

  if (nbPages <= 1) return null;

  // The list is virtualised by the browser scroll position, so jumping to a
  // page without scrolling up would land the reader mid-list.
  const go = (p: number) => {
    refine(Math.min(Math.max(p, 0), nbPages - 1));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const chip = (p: number) => (
    <button
      key={p}
      type="button"
      onClick={() => go(p)}
      aria-current={p === currentRefinement ? "page" : undefined}
      aria-label={"الصفحة " + (p + 1)}
      className={p === currentRefinement ? pageBtnActive : pageBtn}
    >
      {p + 1}
    </button>
  );

  const gap = (key: string) => (
    <span key={key} className="px-1 text-muted-foreground">
      …
    </span>
  );

  const first = pages[0] ?? 0;
  const last = pages[pages.length - 1] ?? 0;

  return (
    <nav
      aria-label="تصفّح الصفحات"
      className="mt-6 flex flex-wrap items-center justify-center gap-1.5 text-xs"
    >
      <button
        type="button"
        onClick={() => go(currentRefinement - 1)}
        disabled={isFirstPage}
        className={isFirstPage ? pageBtnOff : pageBtn}
      >
        → السابق
      </button>

      {first > 0 && chip(0)}
      {first > 1 && gap("gap-start")}

      {pages.map((p) => chip(p))}

      {last < nbPages - 2 && gap("gap-end")}
      {last < nbPages - 1 && chip(nbPages - 1)}

      <button
        type="button"
        onClick={() => go(currentRefinement + 1)}
        disabled={isLastPage}
        className={isLastPage ? pageBtnOff : pageBtn}
      >
        التالي ←
      </button>
    </nav>
  );
}

function Hits() {
  const { items } = useHits<Record<string, any>>();
  const { nbHits } = useStats();
  const { currentRefinement } = usePagination();

  if (items.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        لا توجد نتائج. جرّب كلمات أقل أو أزل بعض الفلاتر.
      </p>
    );
  }

  const from = currentRefinement * HITS_PER_PAGE + 1;
  const to = currentRefinement * HITS_PER_PAGE + items.length;

  return (
    <>
      <p className="mt-3 text-[11px] text-muted-foreground">
        عرض {ar(from)}–{ar(to)} من {ar(nbHits)}
      </p>

      {/* صفوف مضغوطة بفواصل رفيعة بدل البطاقات */}
      <div className="mt-1 divide-y">
        {items.map((t) => {
          const id = String(t.id ?? t.objectID ?? "");
          const landingUrl = String(t.landingUrl || "");
          const href = pdfHref(id, landingUrl);
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
                  href={landingUrl}
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

      <Pagination />
    </>
  );
}

export default function ThesesSearch() {
  const searchClient = useMemo(() => {
    // finitePagination gives an exhaustive page count, which numbered pages
    // need; the infinite "show more" mode only knew whether more rows existed.
    const { searchClient } = instantMeiliSearch(proxyHost(), "proxy", {
      primaryKey: "id",
      finitePagination: true,
    } as any);
    return searchClient as any;
  }, []);

  return (
    <InstantSearch indexName="theses" searchClient={searchClient}>
      <Configure
        hitsPerPage={HITS_PER_PAGE}
        attributesToRetrieve={RETRIEVE}
        attributesToHighlight={[]}
        attributesToSnippet={[]}
      />
      <Header />
      <Filters />
      <ErrorNotice />
      <div className="mt-4 h-px bg-gradient-to-l from-primary/40 via-border to-transparent" />
      <Hits />
    </InstantSearch>
  );
}
