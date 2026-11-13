import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { addPrivateMessage, contactRateAllowed } from "@/lib/private-access/inbox";
export const dynamic = "force-dynamic";
export const metadata = { title: "مراسلة الإدارة", robots: { index: false, follow: false } };
async function submitMessage(form: FormData) {
  "use server";
  if (process.env.PRIVATE_SITE_MODE !== "true") notFound();
  if (String(form.get("website") || "").trim()) redirect("/private/contact?sent=1");
  const name = String(form.get("name") || "").trim();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const body = String(form.get("body") || "").trim();
  if (name.length > 80 || email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || body.length < 3 || body.length > 2000) redirect("/private/contact?error=invalid");
  const h = await headers();
  const ip = h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await contactRateAllowed(ip))) redirect("/private/contact?error=limit");
  try { await addPrivateMessage({name,email,body}); } catch { redirect("/private/contact?error=unavailable"); }
  redirect("/private/contact?sent=1");
}
export default async function ContactPage({searchParams}:{searchParams: Promise<{sent?: string; error?: string}>}) {
  if (process.env.PRIVATE_SITE_MODE !== "true") notFound();
  const {sent,error} = await searchParams;
  return <section className="mx-auto max-w-xl px-5 py-12" dir="rtl">
    <Link href="/private/closed" className="text-sm font-semibold text-blue-700">← العودة</Link>
    <h1 className="mt-5 text-3xl font-bold">مراسلة الإدارة</h1>
    <p className="mt-3 leading-7 text-muted-foreground">أرسل رسالتك وسنستخدم بريدك للرد. لا تكتب معلومات حساسة.</p>
    {sent ? <p role="status" className="mt-6 rounded-lg border border-green-300 p-4">تم استلام رسالتك، شكرًا لك.</p> : <form action={submitMessage} className="mt-7 space-y-5">
      {error && <p role="alert" className="rounded-lg border border-red-300 p-4 text-red-700">{error === "limit" ? "تعذّر إرسال الرسالة الآن. حاول لاحقًا." : error === "invalid" ? "تحقّق من البريد والرسالة." : "خدمة الرسائل غير متاحة حاليًا. حاول لاحقًا."}</p>}
      <label className="block text-sm font-semibold">الاسم (اختياري)<input name="name" maxLength={80} className="mt-2 block min-h-11 w-full rounded-lg border bg-background px-3 text-base" /></label>
      <label className="block text-sm font-semibold">البريد الإلكتروني<input name="email" type="email" required maxLength={160} dir="ltr" className="mt-2 block min-h-11 w-full rounded-lg border bg-background px-3 text-base" /></label>
      <label className="block text-sm font-semibold">الرسالة<textarea name="body" required minLength={3} maxLength={2000} rows={6} className="mt-2 block w-full rounded-lg border bg-background p-3 text-base" /></label>
      <div className="hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <button type="submit" className="min-h-11 rounded-lg bg-blue-700 px-6 font-semibold text-white hover:bg-blue-800">إرسال الرسالة</button>
    </form>}
  </section>;
}
