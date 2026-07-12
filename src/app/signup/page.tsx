import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata = {
  title: "إنشاء حساب — منصة مواضيع دكتوراه الرياضيات",
};

export default async function SignUpPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <div className="mx-auto max-w-sm px-4 py-14">
      {/* ترحيب رسمي صغير */}
      <div className="text-center">
        <span className="text-3xl">🎓</span>
        <h1 className="mt-2 text-lg font-bold">أهلًا بك في المنصة 👋</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          أنشئ حسابك كطالب أو أستاذ خلال دقيقة واحدة
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-t-2 border-t-primary bg-card p-5 shadow-sm">
        <SignupForm />
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        👋 لديك حساب بالفعل؟{" "}
        <Link
          href="/signin"
          className="font-medium text-primary hover:underline"
        >
          سجّل الدخول
        </Link>
      </p>

      <p className="mt-2 text-center text-[10px] text-muted-foreground">
        🔒 بياناتك محفوظة بأمان — لن نشاركها مع أي جهة
      </p>
    </div>
  );
}
