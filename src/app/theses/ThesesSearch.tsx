"use client";

import { useMemo } from "react";
import { instantMeiliSearch } from "@meilisearch/instant-meilisearch";
import {
  Configure,
  InstantSearch,
  RefinementList,
  SearchBox,
  Stats,
  ToggleRefinement,
  useInfiniteHits,
} from "react-instantsearch";
import type { ThesisHit } from "@/lib/theses/meili";

// The proxy exposes Meilisearch under /api/theses/search, so no key ships
// to the browser. instant-meilisearch still wants a string, hence "proxy".
const PROXY = "/api/theses/search";

const boxCls =
  "min-w-0 flex-1 border-0 border-b border-border bg-transparent px-1 py-1 text-xs text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary";

function Hits() {
  const { items, isLastPage, showMore } = useInfiniteHits<ThesisHit>();

  if (items.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        لا توجد نتائج. جرّب كلمات أقل أو أزل بعض الفلاتر.
      </p>
    );
  }

  return (
    <>
      <div className="mt-1 divide-y">
        {items.map((t) => {
          const href = "/api/theses/pdf?id=" + encodeURIComponent(t.id);
          return (
            <div key={t.id} className="group flex items-start gap-3 py-3">
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
  const { searchClient } = useMemo(
    () =>
      instantMeiliSearch(PROXY, "proxy", {
        primaryKey: "id",
        finitePagination: false,
      }),
    []
  );

  return (
    <InstantSearch
      indexName="theses"
      searchClient={searchClient}
      future={{ preserveSharedStateOnUnmount: true }}
    >
      <Configure hitsPerPage={20} />

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <SearchBox
          placeholder="عنوان، مؤلف، مشرف، كلمة مفتاحية…"
          classNames={{
            root: "min-w-0 flex-1",
            form: "flex items-center gap-2",
            input: boxCls,
            submit: "hidden",
            reset: "text-[11px] text-muted-foreground",
            loadingIndicator: "hidden",
          }}
        />
        <Stats
          classNames={{ root: "text-[11px] text-muted-foreground" }}
          translations={{
            rootElementText: ({ nbHits, processingTimeMS }) =>
              nbHits.toLocaleString("ar") +
              " نتيجة في " +
              processingTimeMS +
              " مللي ثانية",
          }}
        />
      </div>

      <div className="mt-3 grid gap-4 sm:grid-cols-[170px_1fr]">
        <aside className="space-y-4 text-[11px]">
          <div>
            <p className="mb-1 font-medium">🏛️ الجامعة</p>
            <RefinementList
              attribute="uniAr"
              limit={8}
              showMore
              searchable
              searchablePlaceholder="بحث…"
              classNames={{
                list: "space-y-0.5",
                label: "flex cursor-pointer items-center gap-1",
                checkbox: "h-3 w-3 accent-primary",
                count: "text-muted-foreground",
                showMore: "mt-1 text-primary",
                searchBox: "mb-1",
              }}
            />
          </div>

          <div>
            <p className="mb-1 font-medium">🎓 الدرجة</p>
            <RefinementList
              attribute="degreeAr"
              limit={6}
              classNames={{
                list: "space-y-0.5",
                label: "flex cursor-pointer items-center gap-1",
                checkbox: "h-3 w-3 accent-primary",
                count: "text-muted-foreground",
              }}
            />
          </div>

          <div>
            <p className="mb-1 font-medium">🧭 الفرع</p>
            <RefinementList
              attribute="branchAr"
              limit={6}
              showMore
              classNames={{
                list: "space-y-0.5",
                label: "flex cursor-pointer items-center gap-1",
                checkbox: "h-3 w-3 accent-primary",
                count: "text-muted-foreground",
                showMore: "mt-1 text-primary",
              }}
            />
          </div>

          <div>
            <p className="mb-1 font-medium">📅 السنة</p>
            <RefinementList
              attribute="year"
              limit={8}
              showMore
              sortBy={["name:desc"]}
              classNames={{
                list: "space-y-0.5",
                label: "flex cursor-pointer items-center gap-1",
                checkbox: "h-3 w-3 accent-primary",
                count: "text-muted-foreground",
                showMore: "mt-1 text-primary",
              }}
            />
          </div>

          <ToggleRefinement
            attribute="hasPdf"
            label="⬇️ ملف محفوظ فقط"
            classNames={{
              label: "flex cursor-pointer items-center gap-1",
              checkbox: "h-3 w-3 accent-primary",
            }}
          />
        </aside>

        <div className="min-w-0">
          <Hits />
        </div>
      </div>
    </InstantSearch>
  );
}
