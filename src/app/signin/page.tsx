import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";
import { safeInternalPath } from "@/lib/safe-redirect";

export const metadata = {
  title: "تسجيل الدخول — منصة مواضيع دكتوراه الرياضيات",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; reason?: string }>;
}) {
  const sp = await searchParams;
  const callbackUrl = safeInternalPath(sp.callbackUrl);
  const session = await auth();
  if (session?.user) redirect(callbackUrl);

  return (
    <div dir="rtl" className="mx-auto w-full max-w-sm px-6 py-16">
      {/* شعار الموقع الرسمي — بدون إطار */}
      <div className="text-center">
        <Image
          src="/icon.png"
          alt="DocMath DZ"
          width={44}
          height={44}
          className="mx-auto h-11 w-11 object-contain"
          priority
        />
        <h1 className="mt-5 text-xl font-bold tracking-tight">تسجيل الدخول</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          منصة مواضيع دكتوراه الرياضيات — DocMath DZ
        </p>
        {sp.reason === "topic-limit" ? (
          <p className="mt-4 text-sm font-medium text-primary">
            سجّل الدخول لمتابعة تصفح المواضيع دون حدود
          </p>
        ) : null}
      </div>

      {/* الدخول عبر Google */}
      <form
        className="mt-8"
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: callbackUrl });
        }}
      >
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-full border bg-transparent px-4 py-2 text-sm font-semibold transition hover:bg-accent"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
            />
          </svg>
          المتابعة بحساب Google
        </button>
      </form>

      {/* فاصل خفيف */}
      <div className="my-7 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">أو باسم المستخدم</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {/* الدخول باسم المستخدم وكلمة المرور */}
      <LoginForm callbackUrl={callbackUrl} />

      <p className="mt-8 text-center text-xs text-muted-foreground">
        ليس لديك حساب؟{" "}
        <Link
          href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="font-semibold text-primary hover:underline"
        >
          أنشئ حسابًا الآن
        </Link>
      </p>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        بتسجيل الدخول أنت توافق على شروط الاستخدام
      </p>
    </div>
  );
}
