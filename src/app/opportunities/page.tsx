import Link from "next/link";
import { listPublicOpportunities, displayStatus, type Opportunity } from "@/lib/opportunities/store";
import { AUTO_ORIGINS, SOURCE_INFO, isAutoOrigin } from "@/lib/opportunities/source-info";
import { lastHarvestRun } from "@/lib/opportunities/harvest";
import { daysLeft, formatDeadline, fundLabels, kindLabels, statusDot, statusLabels } from "@/lib/opportunities/labels";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "فرص الدكتوراه والمنح في الرياضيات",
  description: "فرص دكتوراه ومنح في الرياضيات تُجمع تلقائيًا يوميًا من مصادر رسمية، مع خطوات التقديم وروابط المصادر.",
};

type Params = Promise<{ lang?: string; q?: string; country?: string; funding?: string; status?: string; kind?: string; closed?: string; src?: string }>;

// Same filter style as the topics / theses pages: underline controls, small type.
const selectCls =
  "max-w-[42vw] cursor-pointer border-0 border-b border-border bg-transparent px-1 py-1 text-xs text-foreground transition focus:border-primary focus:outline-none sm:max-w-[200px]";

export default async function OpportunitiesPage({ searchParams }: { searchParams: Params }) {
  const p = await searchParams;
  const en = p.lang === "en";
  const l = en ? 1 : 0;
  const query = (p.q || "").trim().slice(0, 100).toLocaleLowerCase();
  const [items, run] = await Promise.all([listPublicOpportunities(), lastHarvestRun()]);
  const showClosed = p.closed === "1" || p.status === "closed";
  const countries = [...new Set(items.map((i) => i.country).filter(Boolean))].sort();
  const kindOf = (i: Opportunity) => i.kind || "phd";
  const filtered = items.filter(
    (i) =>
      (!query || [i.titleAr, i.titleEn, i.university, i.country, i.field].some((x) => x?.toLocaleLowerCase().includes(query))) &&
      (!p.country || i.country === p.country) &&
      (!p.funding || i.fundingType === p.funding) &&
      (!p.kind || kindOf(i) === p.kind) &&
      (!p.src || (isAutoOrigin(i.origin) ? i.origin : "manual") === p.src) &&
      (!p.status || displayStatus(i) === p.status) &&
      (showClosed || displayStatus(i) !== "closed"),
  );
  const openCount = items.filter((i) => ["open", "closing"].includes(displayStatus(i))).length;
  const closedCount = items.filter((i) => displayStatus(i) === "closed").length;

  const qs = (patch: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries({ lang: p.lang, q: p.q, country: p.country, funding: p.funding, status: p.status, kind: p.kind, closed: p.closed, src: p.src, ...patch }))
      if (v) sp.set(k, v);
    return `/opportunities?${sp.toString()}`;
  };
  const hasFilters = !!(p.q || p.country || p.funding || p.status || p.kind || p.src);
  const live = items.filter((i) => displayStatus(i) !== "closed");
  const perSource = (id: string) => live.filter((i) => (isAutoOrigin(i.origin) ? i.origin : "manual") === id).length;
  const updated = run?.finishedAt ? new Date(run.finishedAt).toLocaleDateString(en ? "en-GB" : "ar-DZ", { day: "numeric", month: "long" }) : null;

  return (
    <div dir={en ? "ltr" : "rtl"} lang={en ? "en" : "ar"} className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-base font-bold">🎓 {en ? "PhD opportunities & scholarships" : "فرص الدكتوراه والمنح"}</h1>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>
            {openCount} {en ? "open" : "فرصة مفتوحة"}
            {updated && <> · {en ? "auto-updated" : "تحديث تلقائي"} {updated}</>}
          </span>
          <Link href={qs({ lang: en ? undefined : "en" })} className="rounded-full border border-border px-2.5 py-0.5 transition hover:border-primary hover:text-primary">
            {en ? "العربية" : "English"}
          </Link>
        </div>
      </div>
      <p className="mt-1 text-[11px] leading-6 text-muted-foreground">
        {en
          ? "Mathematics PhD positions and scholarships collected daily from official sources (MathJobs · AMS, EURAXESS) plus hand-picked programmes."
          : "فرص دكتوراه ومنح في الرياضيات تُجمع يوميًا وتلقائيًا من مصادر رسمية (MathJobs التابعة لـ AMS، وEURAXESS) إضافة إلى برامج مختارة يدويًا."}
      </p>

      <form method="get" action="/opportunities" className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        {en && <input type="hidden" name="lang" value="en" />}
        {p.closed && <input type="hidden" name="closed" value="1" />}
        <input
          name="q"
          defaultValue={p.q}
          maxLength={100}
          aria-label={en ? "Search" : "بحث"}
          placeholder={en ? "Title, university, field…" : "ابحث بالعنوان، الجامعة، التخصص…"}
          className="min-w-0 flex-1 border-0 border-b border-border bg-transparent px-1 py-1 text-xs text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary"
        />
        <button className="rounded-full bg-primary px-4 py-1 text-[11px] font-medium text-primary-foreground transition hover:opacity-90">{en ? "Search" : "بحث"}</button>
        <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2">
          <select name="kind" defaultValue={p.kind || ""} className={selectCls} aria-label={en ? "Type" : "النوع"}>
            <option value="">{en ? "All types" : "كل الأنواع"}</option>
            {Object.entries(kindLabels).map(([k, v]) => <option key={k} value={k}>{v[l]}</option>)}
          </select>
          <select name="country" defaultValue={p.country || ""} className={selectCls} aria-label={en ? "Country" : "الدولة"}>
            <option value="">{en ? "All countries" : "كل الدول"}</option>
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select name="funding" defaultValue={p.funding || ""} className={selectCls} aria-label={en ? "Funding" : "التمويل"}>
            <option value="">{en ? "All funding" : "كل أنواع التمويل"}</option>
            {Object.entries(fundLabels).map(([k, v]) => <option key={k} value={k}>{v[l]}</option>)}
          </select>
          <select name="status" defaultValue={p.status || ""} className={selectCls} aria-label={en ? "Status" : "الحالة"}>
            <option value="">{en ? "All statuses" : "كل الحالات"}</option>
            {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v[l]}</option>)}
          </select>
          {hasFilters && (
            <Link href={qs({ q: undefined, country: undefined, funding: undefined, status: undefined, kind: undefined })} className="text-[11px] text-muted-foreground transition hover:text-destructive">
              {en ? "Clear ✕" : "مسح ✕"}
            </Link>
          )}
        </div>
      </form>

      <div className="mt-4 h-px bg-gradient-to-l from-primary/40 via-border to-transparent" />

      {filtered.length ? (
        <>
          <p className="mt-3 text-[11px] text-muted-foreground">{filtered.length} {en ? "results" : "نتيجة"}</p>
          <div className="mt-1 divide-y">
            {filtered.map((i, index) => {
              const st = displayStatus(i);
              const left = daysLeft(i.deadline);
              const title = en ? i.titleEn : i.titleAr || i.titleEn;
              return (
                <Link key={String(i._id)} href={`/opportunities/${i._id}${en ? "?lang=en" : ""}`} className="group flex items-start gap-3 py-3">
                  <span className="w-8 shrink-0 pt-0.5 text-center text-xs font-bold text-primary">{String(index + 1).padStart(2, "0")}</span>
                  <div className="min-w-0 flex-1">
                    <span dir={!en && !i.titleAr ? "ltr" : undefined} className="block text-sm font-medium leading-relaxed transition group-hover:text-primary">{title}</span>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{i.university} · {i.country}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${statusDot[st]}`} />{statusLabels[st][l]}</span>
                      <span>· {kindLabels[i.kind || "phd"][l]}</span>
                      <span>· {fundLabels[i.fundingType][l]}</span>
                      <span>· {isAutoOrigin(i.origin) ? SOURCE_INFO[i.origin].name : en ? "Editorial" : "مراجعة تحريرية"}</span>
                    </div>
                  </div>
                  <div className="shrink-0 pt-0.5 text-end text-[11px]">
                    <p className="text-muted-foreground">{en ? "Deadline" : "آخر أجل"}</p>
                    <p className={`font-semibold ${st === "closing" ? "text-amber-600 dark:text-amber-400" : st === "closed" ? "text-muted-foreground line-through" : "text-foreground"}`}>
                      {formatDeadline(i.deadline, en)}
                    </p>
                    {left !== null && left >= 0 && st !== "closed" && <p className="text-[10px] text-muted-foreground">{en ? `${left} days left` : `باقي ${left} يوم`}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      ) : (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">{en ? "No matching opportunities right now." : "لا توجد فرص مطابقة حاليًا."}</p>
          <p className="mt-2 text-[11px] text-muted-foreground">{en ? "New opportunities are added automatically every day." : "تُضاف فرص جديدة تلقائيًا كل يوم، عُد لاحقًا."}</p>
        </div>
      )}

      {closedCount > 0 && p.status !== "closed" && (
        <div className="mt-6 text-center">
          <Link href={qs({ closed: showClosed ? undefined : "1" })} className="text-[11px] text-muted-foreground transition hover:text-primary">
            {showClosed ? (en ? "Hide closed opportunities" : "إخفاء الفرص المغلقة") : en ? `Show ${closedCount} closed opportunities` : `عرض ${closedCount} فرصة مغلقة`}
          </Link>
        </div>
      )}

      <section className="mt-10 border-t border-border pt-5">
        <h2 className="text-xs font-bold text-foreground">{en ? "Sources (checked daily)" : "المصادر (تُفحص يوميًا)"}</h2>
        <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {AUTO_ORIGINS.map((id) => (
            <li key={id} className="flex items-baseline justify-between gap-2 text-[11px]">
              <span className="min-w-0">
                <a href={SOURCE_INFO[id].homepage} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:text-primary" dir="ltr">{SOURCE_INFO[id].name}</a>
                <span className="block truncate text-[10px] text-muted-foreground">{en ? SOURCE_INFO[id].en : SOURCE_INFO[id].ar}</span>
              </span>
              <Link href={qs({ src: p.src === id ? undefined : id })} className={`shrink-0 tabular-nums ${p.src === id ? "font-bold text-primary" : "text-muted-foreground hover:text-primary"}`}>
                {perSource(id)}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-6 border-t border-border pt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
        {en
          ? "Listings are collected automatically from public sources and may change. Always verify details and deadlines on the official announcement before applying."
          : "تُجمع الإعلانات آليًا من مصادر عامة وقد تتغير. تحقق دائمًا من التفاصيل والمواعيد في الإعلان الرسمي قبل التقديم."}
      </footer>
    </div>
  );
}
