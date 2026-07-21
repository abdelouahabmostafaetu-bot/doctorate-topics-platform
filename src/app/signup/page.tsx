import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignupForm } from "@/components/auth/signup-form";
import { safeInternalPath } from "@/lib/safe-redirect";

export const metadata = {
  title: "إنشاء حساب — منصة مواضيع دكتوراه الرياضيات",
};

export default async function SignUpPage({
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
        <h1 className="mt-5 text-xl font-bold tracking-tight">إنشاء حساب</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          أنشئ حسابك كطالب أو أستاذ خلال دقيقة واحدة
        </p>
        {sp.reason === "topic-limit" ? (
          <p className="mt-4 text-sm font-medium text-primary">
            أنشئ حسابًا مجانيًا لمتابعة جميع المواضيع
          </p>
        ) : null}
      </div>

      {/* نموذج إنشاء الحساب — بدون صندوق */}
      <div className="mt-8">
        <SignupForm callbackUrl={callbackUrl} />
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        لديك حساب بالفعل؟{" "}
        <Link
          href={`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="font-semibold text-primary hover:underline"
        >
          سجّل الدخول
        </Link>
      </p>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        بياناتك محفوظة بأمان — لن نشاركها مع أي جهة
      </p>
    </div>
  );
}
