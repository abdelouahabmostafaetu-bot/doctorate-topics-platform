import type { ReactNode } from "react";
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

// بطاقة قسم موحّدة بمظهر احترافي
function SettingsCard({
  icon,
  title,
  description,
  children,
  danger = false,
}: {
  icon: string;
  title: string;
  description?: string;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <section
      className={`overflow-hidden rounded-xl border bg-card shadow-sm ${
        danger ? "border-destructive/40" : ""
      }`}
    >
      <div
        className={`flex items-start gap-3 border-b px-5 py-4 ${
          danger ? "border-destructive/20 bg-destructive/5" : "bg-muted/30"
        }`}
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base ${
            danger ? "bg-destructive/10" : "bg-primary/10"
          }`}
        >
          {icon}
        </span>
        <div>
          <h2
            className={`text-sm font-bold ${danger ? "text-destructive" : ""}`}
          >
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

// سطر معلومات للقراءة فقط
function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="truncate font-medium" dir="auto">
        {value}
      </span>
    </div>
  );
}

// شارة صغيرة بحلقة متدرجة (بنفس أسلوب لوحتي)
function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-l from-primary/15 via-primary/5 to-transparent px-3 py-1 text-xs font-medium ring-1 ring-primary/25">
      {children}
    </span>
  );
}

export default async function AccountSettingsPage() {
  const session = await auth();
  const sessionUserId = session?.user?.id;
  if (!sessionUserId) redirect("/signin");

  const user = await prisma.user.findUnique({ where: { id: sessionUserId } });
  if (!user) redirect("/signin");

  const isUsernameAccount = user.email.endsWith(USERNAME_EMAIL_SUFFIX);
  const displayHandle = isUsernameAccount
    ? `@${user.email.slice(0, -USERNAME_EMAIL_SUFFIX.length)}`
    : user.email;

  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  const roleLabel = isAdmin
    ? "🛡️ مدير الموقع"
    : user.userType === "teacher"
      ? "👨‍🏫 أستاذ"
      : "🎓 طالب";

  const joinedAt = new Intl.DateTimeFormat("ar-DZ", {
    dateStyle: "long",
  }).format(user.createdAt);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* رأس الصفحة */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">⚙️ إعدادات الحساب</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            إدارة ملفك الشخصي وأمان حسابك من مكان واحد
          </p>
        </div>
        <Link
          href="/account"
          className="shrink-0 rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
        >
          ← العودة للوحتي
        </Link>
      </div>

      {/* بطاقة نظرة عامة */}
      <div className="mt-6 overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="h-16 bg-gradient-to-l from-primary/25 via-primary/10 to-transparent" />
        <div className="-mt-8 flex flex-wrap items-end gap-4 px-5 pb-4">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt="الصورة الشخصية"
              className="h-16 w-16 rounded-full border-2 border-background object-cover shadow"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-background bg-primary/15 text-2xl font-bold text-primary shadow">
              {(user.name || "؟").charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1 pb-1">
            <p className="truncate text-base font-bold">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground" dir="ltr">
              {displayHandle}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 pb-1">
            <Badge>{roleLabel}</Badge>
            <Badge>⭐ {user.points} نقطة</Badge>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {/* معلومات الحساب (للقراءة فقط) */}
        <SettingsCard
          icon="📋"
          title="معلومات الحساب"
          description="بيانات أساسية للقراءة فقط"
        >
          <div className="divide-y">
            <InfoRow
              label={isUsernameAccount ? "اسم المستخدم" : "البريد الإلكتروني"}
              value={<span dir="ltr">{displayHandle}</span>}
            />
            <InfoRow
              label="طريقة تسجيل الدخول"
              value={
                isUsernameAccount ? "🔑 اسم مستخدم وكلمة مرور" : "🌐 حساب Google"
              }
            />
            <InfoRow label="الدور" value={roleLabel} />
            <InfoRow label="تاريخ الانضمام" value={joinedAt} />
            <InfoRow label="النقاط" value={`⭐ ${user.points}`} />
          </div>
        </SettingsCard>

        {/* الملف الشخصي */}
        <SettingsCard
          icon="👤"
          title="الملف الشخصي"
          description="الاسم والصورة الشخصية ونوع المستخدم"
        >
          <ProfileForm
            initialName={user.name}
            initialImage={user.image ?? null}
            initialUserType={user.userType === "teacher" ? "teacher" : "student"}
          />
        </SettingsCard>

        {/* الأمان */}
        <SettingsCard
          icon="🔐"
          title="الأمان"
          description={
            isUsernameAccount
              ? "غيّر كلمة مرورك بانتظام للحفاظ على أمان حسابك"
              : "حسابك محمي عبر تسجيل الدخول بواسطة Google"
          }
        >
          {isUsernameAccount && user.passwordHash ? (
            <PasswordForm />
          ) : (
            <p className="rounded-md bg-muted px-3 py-2 text-sm leading-6 text-muted-foreground">
              حسابك مسجّل عبر Google — إدارة كلمة المرور تتم من إعدادات حساب
              Google الخاص بك، ولا حاجة لكلمة مرور هنا.
            </p>
          )}
        </SettingsCard>

        {/* منطقة الخطر */}
        <SettingsCard
          icon="🗑️"
          title="منطقة الخطر — حذف الحساب"
          description="إجراء نهائي لا يمكن التراجع عنه"
          danger
        >
          <DeleteAccountForm hasPassword={Boolean(user.passwordHash)} />
        </SettingsCard>
      </div>
    </div>
  );
}
