import { AuthError } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { signIn } from "@/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "دخول المدير", robots: { index: false, follow: false } };

async function privateSignIn(form: FormData) {
  "use server";
  if (process.env.PRIVATE_SITE_MODE !== "true") notFound();
  try {
    await signIn("private-owner", {
      password: String(form.get("password") || ""),
      code: String(form.get("code") || ""),
      redirectTo: "/admin",
    });
  } catch (error) {
    if (error instanceof AuthError) redirect("/private/signin?error=1");
    throw error;
  }
}

export default async function PrivateSignIn({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (process.env.PRIVATE_SITE_MODE !== "true") notFound();
  const { error } = await searchParams;
  return (
    <section className="mx-auto max-w-md px-5 py-14" dir="rtl">
      <p className="text-sm font-semibold text-blue-700">DOCMATH DZ</p>
      <h1 className="mt-3 text-3xl font-bold">دخول المدير</h1>
      <p className="mt-3 leading-7 text-muted-foreground">أدخل رمزك الخاص والرمز الحالي من تطبيق المصادقة.</p>
      {error && <p role="alert" className="mt-6 rounded-lg border border-red-300 p-3 text-sm text-red-700">تعذّر تسجيل الدخول. تحقّق من الرمزَين ثم حاول مجددًا.</p>}
      <form action={privateSignIn} className="mt-8 space-y-5">
        <label className="block text-sm font-semibold">رمز الدخول
          <input name="password" type="password" autoComplete="current-password" required maxLength={1024} className="mt-2 block min-h-11 w-full rounded-lg border bg-background px-3 text-base" />
        </label>
        <label className="block text-sm font-semibold">رمز تطبيق المصادقة
          <input name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required dir="ltr" className="mt-2 block min-h-11 w-full rounded-lg border bg-background px-3 text-base" />
        </label>
        <button className="min-h-11 w-full rounded-lg bg-blue-700 px-4 font-semibold text-white hover:bg-blue-800" type="submit">دخول آمن</button>
      </form>
    </section>
  );
}
