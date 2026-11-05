import Link from "next/link";
import { notFound } from "next/navigation";
import { getOpportunity, toObjectId, displayStatus, isAuto } from "@/lib/opportunities/store";
import { daysLeft, formatDeadline, fundLabels, kindLabels, statusDot, statusLabels } from "@/lib/opportunities/labels";

export const dynamic = "force-dynamic";

export default async function DetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { id } = await params;
  const en = (await searchParams).lang === "en";
  const l = en ? 1 : 0;
  const oid = toObjectId(id);
  if (!oid) notFound();
  const item = await getOpportunity(oid);
  if (!item) notFound();

  const st = displayStatus(item);
  const left = daysLeft(item.deadline);
  const title = en ? item.titleEn : item.titleAr || item.titleEn;
  // Arabic falls back to the original English text (auto-collected records may not be translated).
  const pick = (ar: string, eng: string) => {
    if (en) return eng ? { text: eng, fallback: false } : null;
    if (ar) return { text: ar, fallback: false };
    return eng ? { text: eng, fallback: true } : null;
  };
  const sections = [
    ["عن الفرصة", "About the opportunity", item.descriptionAr, item.descriptionEn],
    ["التمويل", "Funding", item.fundingAr, item.fundingEn],
    ["شروط الترشح", "Eligibility", item.eligibilityAr, item.eligibilityEn],
    ["الوثائق المطلوبة", "Required documents", item.documentsAr, item.documentsEn],
    ["طريقة التقديم", "How to apply", item.applicationAr, item.applicationEn],
  ] as const;
  const back = `/opportunities${en ? "?lang=en" : ""}`;

  return (
    <main dir={en ? "ltr" : "rtl"} lang={en ? "en" : "ar"} className="min-h-screen bg-[#f8fafc] px-5 py-8 dark:bg-background sm:px-8 sm:py-14">
      <article className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <Link href={back} className="text-xs text-muted-foreground transition hover:text-primary">{en ? "← All opportunities" : "← كل الفرص"}</Link>
          <Link href={`/opportunities/${id}${en ? "" : "?lang=en"}`} className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground transition hover:border-primary hover:text-primary">
            {en ? "العربية" : "English"}
          </Link>
        </div>

        <header className="mt-5 border-b border-slate-200 pb-6 dark:border-border">
          <p className="flex flex-wrap items-center gap-x-2 text-[10px] font-bold tracking-[0.12em] text-primary">
            <span className="inline-flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${statusDot[st]}`} />{statusLabels[st][l]}</span>
            <span>· {kindLabels[item.kind || "phd"][l]}</span>
            <span>· {fundLabels[item.fundingType][l]}</span>
          </p>
          <h1 dir={!en && !item.titleAr ? "ltr" : undefined} className="mt-3 text-2xl font-bold leading-relaxed sm:text-3xl">{title}</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.university} · {item.country}</p>

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-xs sm:grid-cols-4">
            <div>
              <dt className="text-[10px] text-muted-foreground">{en ? "Deadline" : "آخر أجل"}</dt>
              <dd className={`mt-0.5 font-semibold ${st === "closing" ? "text-amber-600 dark:text-amber-400" : ""}`}>{formatDeadline(item.deadline, en)}</dd>
              {item.deadlineTimezone && <dd className="text-[10px] text-muted-foreground">{item.deadlineTimezone}</dd>}
            </div>
            <div>
              <dt className="text-[10px] text-muted-foreground">{en ? "Time left" : "الوقت المتبقي"}</dt>
              <dd className="mt-0.5 font-semibold">{left === null ? "—" : left < 0 ? (en ? "Expired" : "انتهى") : en ? `${left} days` : `${left} يوم`}</dd>
            </div>
            <div>
              <dt className="text-[10px] text-muted-foreground">{en ? "Source" : "المصدر"}</dt>
              <dd className="mt-0.5 font-semibold">{item.sourceName}</dd>
            </div>
            <div>
              <dt className="text-[10px] text-muted-foreground">{en ? "Last checked" : "آخر تحقق"}</dt>
              <dd className="mt-0.5 font-semibold">{new Date(item.verifiedAt).toLocaleDateString(en ? "en-GB" : "ar-DZ")}</dd>
              <dd className="text-[10px] text-muted-foreground">{isAuto(item) ? (en ? "automatic" : "آليًا") : en ? "editorial" : "مراجعة يدوية"}</dd>
            </div>
          </dl>
        </header>

        <div className="mt-7 space-y-7">
          {sections.map(([ar, eng, arText, enText]) => {
            const v = pick(arText, enText);
            if (!v) return null;
            return (
              <section key={eng}>
                <h2 className="text-sm font-bold">{en ? eng : ar}</h2>
                {v.fallback && <p className="mt-1 text-[10px] text-muted-foreground">النص الأصلي بالإنجليزية كما ورد في الإعلان</p>}
                <p dir={v.fallback ? "ltr" : undefined} className="mt-2 whitespace-pre-line text-[15px] leading-8 text-slate-800 dark:text-slate-100">{v.text}</p>
              </section>
            );
          })}
        </div>

        <div className="mt-10 flex flex-wrap gap-2">
          <a href={item.applicationUrl || item.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground transition hover:opacity-90">
            {en ? "Apply on the official website ↗" : "التقديم عبر الموقع الرسمي ↗"}
          </a>
          {item.sourceUrl !== item.applicationUrl && (
            <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-full border border-primary/40 px-5 py-2.5 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground">
              {en ? "Official announcement ↗" : "الإعلان الرسمي ↗"}
            </a>
          )}
          {item.referenceUrl && (
            <a href={item.referenceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-full border border-border px-5 py-2.5 text-xs font-bold text-muted-foreground transition hover:border-primary hover:text-primary">
              {en ? "More information ↗" : "معلومات إضافية ↗"}
            </a>
          )}
          {item.fundingUrl && (
            <a href={item.fundingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-full border border-border px-5 py-2.5 text-xs font-bold text-muted-foreground transition hover:border-primary hover:text-primary">
              {en ? "Funding details ↗" : "تفاصيل التمويل ↗"}
            </a>
          )}
        </div>
        <p className="mt-5 text-[11px] leading-6 text-muted-foreground">
          {en ? "Verify all details and deadlines on the official source before applying." : "تحقق من جميع التفاصيل والمواعيد في المصدر الرسمي قبل التقديم."}
        </p>
      </article>
    </main>
  );
}
