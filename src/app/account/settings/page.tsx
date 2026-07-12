import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  ProfileForm,
  PasswordForm,
  DeleteAccountForm,
} from "@/components/account/account-forms";
import { USERNAME_EMAIL_SUFFIX } from "@/lib/username";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "إعدادات الحساب — منصة مواضيع دكتوراه الرياضيات",
};

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="shrink-0 text-sm font-semibold">{title}</h2>
      <div className="h-px flex-1 bg-gradient-to-l from-border to-transparent" />
    </div>
  );
}

export default async function AccountSettingsPage() {
  const session = await auth();
  const sessionUserId = session?.user?.id;
  if (!sessionUserId) redirect("/signin");

  const user = await prisma.user.findUnique({ where: { id: sessionUserId } });
  if (!user) redirect("/signin");

  const isUsernameAccount = user.email.endsWith(USERNAME_EMAIL_SUFFIX);

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">⚙️ إعدادات الحساب</h1>
        <Link
          href="/account"
          className="text-xs text-muted-foreground transition hover:text-primary"
        >
          ← العودة للوحتي
        </Link>
      </div>

      {/* الملف الشخصي: تغيير الصورة والاسم */}
      <section className="mt-6 space-y-4">
        <SectionHeader title="👤 الملف الشخصي — الصورة والاسم" />
        <ProfileForm
          initialName={user.name}
          initialImage={user.image ?? null}
        />
      </section>

      {/* الأمان: تغيير كلمة المرور (لحسابات اسم المستخدم فقط) */}
      {isUsernameAccount && user.passwordHash && (
        <section className="mt-8 space-y-4">
          <SectionHeader title="🔐 الأمان — كلمة المرور" />
          <PasswordForm />
        </section>
      )}

      {/* حذف الحساب */}
      <section className="mt-8 space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="shrink-0 text-sm font-semibold text-destructive">
            🗑️ حذف الحساب
          </h2>
          <div className="h-px flex-1 bg-gradient-to-l from-destructive/40 to-transparent" />
        </div>
        <DeleteAccountForm hasPassword={Boolean(user.passwordHash)} />
      </section>
    </div>
  );
}
