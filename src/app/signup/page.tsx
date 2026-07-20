import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata = {
  title: "إنشاء حساب — منصة مواضيع دكتوراه الرياضيات",
};

export default async function SignUpPage() {
  const session = await auth();
  if (session?.user) redirect("/");

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
      </div>

      {/* نموذج إنشاء الحساب — بدون صندوق */}
      <div className="mt-8">
        <SignupForm />
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        لديك حساب بالفعل؟{" "}
        <Link
          href="/signin"
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
