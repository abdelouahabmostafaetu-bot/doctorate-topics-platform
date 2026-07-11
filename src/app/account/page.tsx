import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TopicCard } from "@/components/topic-card";
import {
  ProfileForm,
  PasswordForm,
  DeleteAccountForm,
} from "@/components/account/account-forms";
import { USERNAME_EMAIL_SUFFIX } from "@/lib/username";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "لوحتي الشخصية — منصة مواضيع دكتوراه الرياضيات",
};

function StatCard({
  icon,
  value,
  label,
}: {
  icon: string;
  value: number | string;
  label: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 text-center shadow-sm">
      <div className="text-2xl">{icon}</div>
      <div className="mt-1 text-2xl font-bold text-primary">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
  hint,
}: {
  href: string;
  icon: string;
  label: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border bg-card p-4 shadow-sm transition hover:border-primary hover:shadow-md"
    >
      <div className="text-2xl transition group-hover:scale-110">{icon}</div>
      <div className="mt-1.5 text-sm font-semibold">{label}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
    </Link>
  );
}

export default async function AccountPage() {
  const session = await auth();
  const sessionUserId = session?.user?.id;
  if (!sessionUserId) redirect("/signin");

  // نقرأ أحدث بيانات المستخدم من قاعدة البيانات مباشرة
  const user = await prisma.user.findUnique({ where: { id: sessionUserId } });
  if (!user) redirect("/signin");

  const isUsernameAccount = user.email.endsWith(USERNAME_EMAIL_SUFFIX);
  const displayHandle = isUsernameAccount
    ? `@${user.email.slice(0, -USERNAME_EMAIL_SUFFIX.length)}`
    : user.email;

  // الإحصائيات + المواضيع المحفوظة
  const [favorites, contribTotal, contribAccepted, reportsCount] =
    await Promise.all([
      prisma.favorite.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.contribution.count({ where: { userId: user.id } }),
      prisma.contribution.count({
        where: { userId: user.id, status: "accepted" },
      }),
      prisma.report.count({ where: { userId: user.id } }),
    ]);

  const favoriteTopics = favorites.length
    ? await prisma.topic.findMany({
        where: {
          id: { in: favorites.map((f) => f.topicId) },
          status: "published",
        },
        include: { university: true, specialty: true },
      })
    : [];
  const orderedTopics = favorites
    .map((f) => favoriteTopics.find((t) => t.id === f.topicId))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  const memberSince = new Intl.DateTimeFormat("ar-DZ", {
    year: "numeric",
    month: "long",
  }).format(user.createdAt);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* رأس الصفحة — بطاقة الملف الشخصي */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="h-20 bg-gradient-to-l from-primary/30 via-primary/10 to-transparent" />
        <div className="flex flex-wrap items-end gap-4 px-5 pb-5">
          <div className="-mt-10">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt="الصورة الشخصية"
                className="h-24 w-24 rounded-full border-4 border-card object-cover shadow"
              />
            ) : (
              <span className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-card bg-primary/15 text-4xl font-bold text-primary shadow">
                {(user.name || "؟").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold">{user.name}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground" dir="ltr">
              {displayHandle}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {user.userType && (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-medium text-primary">
                  {user.userType === "teacher" ? "👨‍🏫 أستاذ" : "🎓 طالب"}
                </span>
              )}
              {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  🛡️ مدير
                </span>
              )}
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-muted-foreground">
                عضو منذ {memberSince}
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/5 px-5 py-3 text-center">
            <div className="text-2xl font-bold text-primary">
              🏆 {user.points}
            </div>
            <div className="text-xs text-muted-foreground">نقطة مساهمة</div>
          </div>
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon="🏆" value={user.points} label="النقاط" />
        <StatCard
          icon="🌱"
          value={contribAccepted + " / " + contribTotal}
          label="مساهمات مقبولة / مرسلة"
        />
        <StatCard icon="⭐" value={orderedTopics.length} label="مواضيع محفوظة" />
        <StatCard icon="🚨" value={reportsCount} label="بلاغات مرسلة" />
      </div>

      {/* إجراءات سريعة */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <QuickAction
          href="/topics/random"
          icon="🎲"
          label="موضوع عشوائي"
          hint="افتح موضوعًا عشوائيًا للتدرّب"
        />
        <QuickAction
          href="/contribute"
          icon="🌱"
          label="ساهم بموضوع"
          hint="اكسب نقاطًا بإضافة مواضيع"
        />
        <QuickAction
          href="/search"
          icon="🔍"
          label="تصفّح المواضيع"
          hint="ابحث وفلتر كل المواضيع"
        />
        <QuickAction
          href="/latex-guide"
          icon="📖"
          label="دليل LaTeX"
          hint="تعلّم كتابة الرياضيات"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* المواضيع المحفوظة */}
        <section className="lg:col-span-2">
          <h2 className="font-semibold">
            ⭐ مواضيعي المحفوظة ({orderedTopics.length})
          </h2>
          {orderedTopics.length === 0 ? (
            <div className="mt-4 rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
              لم تحفظ أي موضوع بعد — افتح أي موضوع واضغط “☆ حفظ
              الموضوع”
              <div className="mt-3">
                <Link href="/search" className="text-primary hover:underline">
                  تصفّح المواضيع ←
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {orderedTopics.map((t) => (
                <TopicCard key={t.id} topic={t} />
              ))}
            </div>
          )}
        </section>

        {/* الإعدادات */}
        <div className="space-y-6">
          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <h2 className="font-semibold">⚙️ الإعدادات — الملف الشخصي</h2>
            <div className="mt-4">
              <ProfileForm
                initialName={user.name}
                initialImage={user.image ?? null}
              />
            </div>
          </section>

          {isUsernameAccount && user.passwordHash && (
            <section className="rounded-lg border bg-card p-5 shadow-sm">
              <h2 className="font-semibold">🔐 الأمان</h2>
              <div className="mt-4">
                <PasswordForm />
              </div>
            </section>
          )}

          <section className="rounded-lg border border-destructive/40 bg-card p-5 shadow-sm">
            <h2 className="font-semibold text-destructive">⚠️ منطقة الخطر</h2>
            <div className="mt-4">
              <DeleteAccountForm hasPassword={Boolean(user.passwordHash)} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
