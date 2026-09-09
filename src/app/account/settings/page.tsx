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

// شارة إحصائية صغيرة بإطار جميل مختلف (حلقة متدرجة) — بنفس أسلوب صفحة لوحتي الشخصية
function StatChip({
  icon,
  value,
  label,
}: {
  icon: string;
  value: number | string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-l from-primary/15 via-primary/5 to-transparent px-3 py-1 text-xs ring-1 ring-primary/25">
      <span>{icon}</span>
      <b className="text-primary">{value}</b>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

function QuickLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
    >
      {icon} {label}
    </Link>
  );
}

// قسم موحّد بعنوان + خط متدرج فاصل (بنفس أسلوب عناوين لوحتي الشخصية) يحتضن بطاقة النموذج
function SettingsSection({
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
    <section className="mt-8">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm ${
            danger ? "bg-destructive/10" : "bg-primary/10"
          }`}
        >
          {icon}
        </span>
        <h2
          className={`shrink-0 text-sm font-semibold ${
            danger ? "text-destructive" : ""
          }`}
        >
          {title}
        </h2>
        <div className="h-px flex-1 bg-gradient-to-l from-border to-transparent" />
      </div>
      {description && (
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {description}
        </p>
      )}
      <div
        className={`mt-4 rounded-xl border bg-card p-5 shadow-sm ${
          danger ? "border-destructive/40" : ""
        }`}
      >
        {children}
      </div>
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

  const memberSince = new Intl.DateTimeFormat("ar-DZ", {
    year: "numeric",
    month: "long",
  }).format(user.createdAt);

  const joinedAt = new Intl.DateTimeFormat("ar-DZ", {
    dateStyle: "long",
  }).format(user.createdAt);

  // نفس إحصائيات صفحة لوحتي الشخصية — لتبقى الصفحتان متطابقتين في التصميم والمحتوى
  const [favoritesCount, contribTotal, contribAccepted, reportsCount] =
    await Promise.all([
      prisma.favorite.count({ where: { userId: user.id } }),
      prisma.contribution.count({ where: { userId: user.id } }),
      prisma.contribution.count({
        where: { userId: user.id, status: "accepted" },
      }),
      prisma.report.count({ where: { userId: user.id } }),
    ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* رأس بدون إطار: الصورة + الاسم + الصفة — وزر العودة في الجهة المقابلة (بنفس أسلوب لوحتي الشخصية) */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt="الصورة الشخصية"
              className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/30"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-2xl font-bold text-primary ring-2 ring-primary/30">
              {(user.name || "؟").charAt(0).toUpperCase()}
            </span>
          )}
          <div>
            <h1 className="text-lg font-bold">⚙️ إعدادات الحساب</h1>
            <p className="mt-0.5 text-xs font-medium text-primary">
              {roleLabel}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              <span dir="ltr">{displayHandle}</span> · عضو منذ {memberSince}
            </p>
          </div>
        </div>

        <Link
          href="/account"
          title="لوحتي الشخصية"
          className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
        >
          ← العودة للوحتي
        </Link>
      </div>

      {/* شارات صغيرة: نفس شارات لوحتي الشخصية */}
      <div className="mt-4 flex flex-wrap gap-2">
        <StatChip icon="🏆" value={user.points} label="نقطة" />
        <StatChip
          icon="🌱"
          value={contribAccepted + " / " + contribTotal}
          label="مساهمة مقبولة"
        />
        <StatChip icon="⭐" value={favoritesCount} label="موضوع محفوظ" />
        <StatChip icon="🚨" value={reportsCount} label="بلاغ" />
      </div>

      {/* روابط سريعة صغيرة — نفس روابط لوحتي الشخصية */}
      <div className="mt-3 flex flex-wrap gap-2">
        <QuickLink href="/account" icon="🏠" label="لوحتي الشخصية" />
        <QuickLink href="/contribute" icon="🌱" label="ساهم بموضوع" />
        <QuickLink href="/search" icon="🔍" label="تصفّح المواضيع" />
        <QuickLink href="/latex-guide" icon="📖" label="دليل LaTeX" />
      </div>

      {/* معلومات الحساب (للقراءة فقط) */}
      <SettingsSection
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
      </SettingsSection>

      {/* الملف الشخصي */}
      <SettingsSection
        icon="👤"
        title="الملف الشخصي"
        description="الاسم والصورة الشخصية ونوع المستخدم"
      >
        <ProfileForm
          initialName={user.name}
          initialImage={user.image ?? null}
          initialUserType={user.userType === "teacher" ? "teacher" : "student"}
        />
      </SettingsSection>

      {/* الأمان */}
      <SettingsSection
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
      </SettingsSection>

      {/* منطقة الخطر */}
      <SettingsSection
        icon="🗑️"
        title="منطقة الخطر — حذف الحساب"
        description="إجراء نهائي لا يمكن التراجع عنه"
        danger
      >
        <DeleteAccountForm hasPassword={Boolean(user.passwordHash)} />
      </SettingsSection>
    </div>
  );
}
