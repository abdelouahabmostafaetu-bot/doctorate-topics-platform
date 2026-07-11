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
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-center text-2xl font-bold">إنشاء حساب جديد</h1>
      <p className="mt-2 text-center text-muted-foreground">
        سجّل كطالب أو أستاذ باسم مستخدم وكلمة مرور
      </p>

      <div className="mt-8 rounded-xl border bg-card p-6 shadow-sm">
        <SignupForm />
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        لديك حساب بالفعل؟{" "}
        <Link
          href="/signin"
          className="font-medium text-primary hover:underline"
        >
          سجّل الدخول
        </Link>
      </p>
    </div>
  );
}
