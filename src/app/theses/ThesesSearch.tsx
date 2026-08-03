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

// The proxy exposes Meilisearch under /api/theses/search, so no key ships to
// the browser. instant-meilisearch still wants an API key string, hence
// "proxy", which the route ignores.
const PROXY = "/api/theses/search";

// Same visual language as the original server-rendered page: underlines
// instead of boxes, tiny type, one filter row. The widgets are rebuilt from
// InstantSearch hooks so the markup stays identical to what shipped before.
const selectCls =
  "max-w-[42vw] cursor-pointer border-0 border-b border-border bg-transparent px-1 py-1 text-xs text-foreground transition focus:border-primary focus:outline-none sm:max-w-[200px]";
const smallCls =
  "w-24 cursor-pointer border-0 border-b border-border bg-transparent px-1 py-1 text-[11px] text-foreground transition focus:border-primary focus:outline-none";

function FacetSelect({
  attribute,
  placeholder,
  className,
  limit = 300,
  sortBy,
  withCount = true,
}: {
  attribute: string;
  placeholder: string;
  className: string;
  limit?: number;
  sortBy?: string[];
  withCount?: boolean;
}) {
  const { items, refine } = useRefinementList({
    attribute,
    limit,
    sortBy: sortBy as any,
  });
  const current = items.find((i) => i.isRefined)?.value ?? "";

  return (
    <select
      className={className}
      value={current}
      aria-label={placeholder}
      onChange={(e) => {
        const next = e.target.value;
        if (current) refine(current);
        if (next && next !== current) refine(next);
      }}
    >
      <option value="">{placeholder}</option>
      {items.map((i) => (
        <option key={i.value} value={i.value}>
          {withCount ? i.label + " (" + i.count + ")" : i.label}
        </option>
      ))}
    </select>
  );
}

function Controls() {
  const { query, refine: setQuery } = useSearchBox();
  const { nbHits } = useStats();
  const pdf = useToggleRefinement({ attribute: "hasPdf", on: true });
  const clear = useClearRefinements();
  const hasAnyFilter = Boolean(query) || clear.canRefine;

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-base font-bold">🎓 الأطروحات والمذكّرات</h1>
        <p className="text-[11px] text-muted-foreground">
          {nbHits.toLocaleString("ar")} نتيجة · بحث فوري مع تصحيح إملائي
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="عنوان، مؤلف، مشرف، كلمة مفتاحية…"
          className="min-w-0 flex-1 border-0 border-b border-border bg-transparent px-1 py-1 text-xs text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary"
        />

        <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2">
          <FacetSelect
            attribute="uniAr"
            placeholder="🏛️ كل الجامعات"
            className={selectCls}
          />
          <FacetSelect
            attribute="degreeAr"
            placeholder="🎓 الدرجة"
            className={smallCls}
            withCount={false}
          />
          <FacetSelect
            attribute="branchAr"
            placeholder="🧭 كل الفروع"
            className={selectCls}
            withCount={false}
          />
          <FacetSelect
            attribute="year"
            placeholder="📅 السنة"
            className={smallCls}
            sortBy={["name:desc"]}
          />

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

      <div className="mt-4 h-px bg-gradient-to-l from-primary/40 via-border to-transparent" />
    </>
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
        عرض {items.length.toLocaleString("ar")} من {nbHits.toLocaleString("ar")}
      </p>

      <div className="mt-1 divide-y">
        {items.map((t) => {
          const id = String(t.id ?? t.objectID ?? "");
          const href = "/api/theses/pdf?id=" + encodeURIComponent(id);
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
                  className="text-primary transition hover:opacity-70"
                  title="تحميل PDF"
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
      <Controls />
      <Hits />
    </InstantSearch>
  );
}
