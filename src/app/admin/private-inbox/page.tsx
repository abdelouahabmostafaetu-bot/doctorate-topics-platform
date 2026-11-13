import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import { listPrivateMessages, recentClosedPageViews } from "@/lib/private-access/inbox";
import { markRead, reply } from "./actions";
export const dynamic = "force-dynamic";
export default async function PrivateInbox({searchParams}:{searchParams: Promise<{status?: string}>}) {
  if (process.env.PRIVATE_SITE_MODE !== "true") notFound();
  const session = await auth(), epoch = process.env.PRIVATE_ACCESS_EPOCH;
  if (!epoch || !process.env.PRIVATE_ADMIN_EMAIL || session?.user?.email?.toLowerCase() !== process.env.PRIVATE_ADMIN_EMAIL.toLowerCase() || session.user.role !== "SUPER_ADMIN" || session.user.blocked || session.user.privateAccessEpoch !== epoch) redirect("/private/closed");
  const {status} = await searchParams;
  const [messages, views] = await Promise.all([listPrivateMessages(), recentClosedPageViews()]);
  const notices: Record<string,string> = {sent: "أُرسل الرد إلى البريد الإلكتروني.", "mail-error": "لم يُرسل الرد. تحقّق من إعداد خدمة البريد.", "sent-unrecorded": "أُرسل الرد، لكن تعذّر حفظه في السجل؛ تجنّب إرساله مرة أخرى قبل التحقق.", invalid: "تحقّق من الرسالة والرد."};
  return <section className="max-w-4xl space-y-8" dir="rtl">
    <div><h1 className="text-2xl font-bold">الرسائل والتنبيهات</h1><p className="mt-2 leading-7 text-muted-foreground">رسائل الزوار ومحاولات فتح صفحة الإغلاق.</p></div>
    {status && notices[status] && <p role="status" className="rounded-lg border p-4">{notices[status]}</p>}
    <section className="rounded-xl border p-5"><h2 className="font-bold">زيارات صفحة الإغلاق</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">عدد تقريبي لمرات تحميل الصفحة، وقد يشمل إعادة التحميل والروبوتات. لا يحدد هوية الزائر.</p>
      {views ? <ul className="mt-4 grid gap-2 sm:grid-cols-2">{views.map(v=><li key={v.day} className="flex justify-between border-b py-2"><span dir="ltr">{v.day}</span><strong>{v.count}</strong></li>)}</ul> : <p className="mt-3 text-sm">عداد الزيارات غير متاح حاليًا.</p>}
    </section>
    <div><h2 className="text-xl font-bold">رسائل الزوار <span className="text-sm font-normal text-muted-foreground">({messages.filter(m=>!m.readAt).length} جديدة)</span></h2>
      {!messages.length && <p className="mt-4 rounded-lg border border-dashed p-6 text-muted-foreground">لا توجد رسائل حاليًا.</p>}
      <div className="mt-4 space-y-4">{messages.map(m=><article key={String(m._id)} className="rounded-xl border p-5">
        <div className="flex flex-wrap justify-between gap-2"><strong>{m.name || "زائر"}{!m.readAt && " · جديدة"}</strong><time dir="ltr" className="text-sm text-muted-foreground">{m.createdAt.toISOString().slice(0,16).replace("T"," ")} UTC</time></div>
        <p dir="ltr" className="mt-2 break-all text-sm text-muted-foreground">{m.email}</p><p className="mt-4 whitespace-pre-wrap leading-7">{m.body}</p>
        {m.replies?.map((r,i)=><div key={i} className="mt-4 rounded-lg bg-muted p-3 text-sm"><strong>رد مرسل</strong><p className="mt-1 whitespace-pre-wrap">{r.body}</p></div>)}
        {!m.readAt && <form action={markRead} className="mt-4"><input type="hidden" name="id" value={String(m._id)} /><button className="min-h-11 rounded-lg border px-4">تمت القراءة</button></form>}
        <form action={reply} className="mt-4 space-y-3"><input type="hidden" name="id" value={String(m._id)} /><label className="block text-sm font-semibold">الرد عبر البريد<textarea name="reply" rows={3} required maxLength={4000} className="mt-2 block w-full rounded-lg border bg-background p-3 text-base" /></label><button className="min-h-11 rounded-lg bg-blue-700 px-5 font-semibold text-white">إرسال الرد</button></form>
      </article>)}</div>
    </div>
  </section>;
}
