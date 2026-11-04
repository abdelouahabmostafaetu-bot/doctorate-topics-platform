import Link from "next/link";
import { opportunitiesCollection, displayStatus } from "@/lib/opportunities/store";

export const dynamic = "force-dynamic";
export const metadata = { title: "فرص الدكتوراه في الرياضيات", description: "فرص الدكتوراه والمنح في الرياضيات من مصادرها الرسمية." };
const statusLabels = {open: ["مفتوح", "Open"], closing: ["يغلق قريباً", "Closing soon"], closed: ["مغلق", "Closed"], unknown: ["يحتاج إلى تحقق", "Needs verification"]};
const fundLabels = {fully_funded: ["تمويل كامل", "Fully funded"], partially_funded: ["تمويل جزئي", "Partially funded"], salary: ["منصب براتب", "Salaried position"], unknown: ["التمويل غير محدد", "Funding unspecified"]};
type Params = Promise<{lang?: string; q?: string; country?: string; funding?: string; status?: string}>;
export default async function OpportunitiesPage({searchParams}: {searchParams: Params}) {
  const p = await searchParams; const en = p.lang === "en"; const l = en ? 1 : 0;
  const query = (p.q || "").trim().slice(0, 100).toLocaleLowerCase();
  const items = await opportunitiesCollection().find({published: true}).sort({updatedAt: -1}).limit(500).toArray();
  const countries = [...new Set(items.map(i => i.country).filter(Boolean))].sort();
  const filtered = items.filter(i => (!query || [i.titleAr,i.titleEn,i.university,i.country,i.field].some(x => x?.toLocaleLowerCase().includes(query))) && (!p.country || i.country === p.country) && (!p.funding || i.fundingType === p.funding) && (!p.status || displayStatus(i) === p.status));
  return <div dir={en ? "ltr" : "rtl"} lang={en ? "en" : "ar"} className="min-h-screen bg-slate-50 text-slate-900 dark:bg-background dark:text-foreground">
    <section className="bg-[#102a43] text-white"><div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <div className="flex flex-wrap items-center justify-between gap-5"><p className="text-sm font-medium tracking-wide text-sky-200">DOCMATH DZ / {en ? "OPPORTUNITIES" : "فرص الباحثين"}</p><Link href={`/opportunities?lang=${en ? "ar" : "en"}`} className="rounded-lg border border-white/40 px-4 py-2 text-sm font-semibold hover:bg-white/10">{en ? "العربية" : "English"}</Link></div>
      <h1 className="mt-6 max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">{en ? "Find your next step in mathematics" : "خطوتك القادمة في الرياضيات"}</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200">{en ? "Explore doctoral positions and scholarships, with practical application guidance and links to official sources." : "اكتشف فرص الدكتوراه والمنح، مع خطوات التقديم وروابط المصادر الرسمية."}</p>
    </div></section>
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-border dark:bg-card sm:grid-cols-2 lg:grid-cols-6" action="/opportunities">
        <input type="hidden" name="lang" value={en ? "en" : "ar"}/>
        <label className="sr-only" htmlFor="q">{en ? "Search" : "بحث"}</label><input className="min-h-11 rounded-lg border bg-transparent px-3 text-base lg:col-span-2" id="q" name="q" defaultValue={p.q} placeholder={en ? "Title, university, field…" : "العنوان، الجامعة، التخصص…"}/>
        <label className="sr-only" htmlFor="country">{en ? "Country" : "الدولة"}</label><select className="min-h-11 rounded-lg border bg-transparent px-3" id="country" name="country" defaultValue={p.country || ""}><option value="">{en ? "All countries" : "كل الدول"}</option>{countries.map(c => <option key={c}>{c}</option>)}</select>
        <label className="sr-only" htmlFor="funding">{en ? "Funding" : "التمويل"}</label><select className="min-h-11 rounded-lg border bg-transparent px-3" id="funding" name="funding" defaultValue={p.funding || ""}><option value="">{en ? "All funding" : "كل أنواع التمويل"}</option>{Object.entries(fundLabels).map(([k,v]) => <option value={k} key={k}>{v[l]}</option>)}</select>
        <label className="sr-only" htmlFor="status">{en ? "Status" : "الحالة"}</label><select className="min-h-11 rounded-lg border bg-transparent px-3" id="status" name="status" defaultValue={p.status || ""}><option value="">{en ? "All statuses" : "كل الحالات"}</option>{Object.entries(statusLabels).map(([k,v]) => <option value={k} key={k}>{v[l]}</option>)}</select>
        <button className="min-h-11 rounded-lg bg-[#1264a3] px-5 font-semibold text-white hover:bg-[#0e5084]">{en ? "Search" : "بحث"}</button>
      </form>
      <div className="mb-5 mt-8 flex items-center justify-between"><h2 className="text-xl font-bold">{en ? "Opportunities" : "الفرص المتاحة"}</h2><span className="text-sm text-slate-600 dark:text-slate-300">{filtered.length} {en ? "results" : "نتيجة"}</span></div>
      {filtered.length ? <div className="grid gap-4 md:grid-cols-2">{filtered.map(i => <article key={String(i._id)} className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 dark:border-border dark:bg-card"><div className="flex flex-wrap gap-2 text-sm"><span className="rounded-full bg-sky-100 px-3 py-1 font-medium text-sky-900 dark:bg-sky-950 dark:text-sky-100">{statusLabels[displayStatus(i)][l]}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{fundLabels[i.fundingType][l]}</span></div><h3 className="mt-4 text-xl font-bold leading-8"><Link href={`/opportunities/${i._id}?lang=${en ? "en" : "ar"}`} className="hover:underline">{en ? i.titleEn : i.titleAr}</Link></h3><p className="mt-2 text-base text-slate-600 dark:text-slate-300">{i.university} · {i.country}</p><p className="mt-3 flex-1 text-base leading-7 text-slate-600 dark:text-slate-300">{en ? i.descriptionEn : i.descriptionAr}</p><div className="mt-5 flex flex-wrap justify-between gap-3 border-t pt-4 text-sm"><span>{en ? "Deadline" : "آخر أجل"}: {i.deadline || (en ? "Not specified" : "غير محدد")}</span><Link className="font-semibold text-blue-700 dark:text-blue-300" href={`/opportunities/${i._id}?lang=${en ? "en" : "ar"}`}>{en ? "View details →" : "التفاصيل ←"}</Link></div></article>)}</div> : <div className="rounded-xl border bg-white p-10 text-center dark:bg-card"><p className="font-semibold">{en ? "No opportunities found" : "لا توجد فرص مطابقة حالياً"}</p><p className="mt-2 text-slate-600 dark:text-slate-300">{en ? "Try another search or check back later." : "جرّب البحث بمعايير أخرى أو عُد لاحقاً."}</p></div>}
      <p className="mt-8 text-sm leading-6 text-slate-600 dark:text-slate-300">{items.length === 500 && (en ? "Showing the 500 most recently updated entries. " : "تُعرض أحدث 500 فرصة منشورة. ")}{en ? "Always check the official announcement before applying. Information and deadlines may change." : "تحقق دائماً من الإعلان الرسمي قبل التقديم؛ قد تتغير المعلومات والمواعيد."}</p>
    </main></div>;
}
