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

  // المواضيع المحفوظة — الأحدث أولًا
  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
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
      {/* رأس الصفحة */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-5 shadow-sm">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt="الصورة الشخصية"
            className="h-20 w-20 rounded-full border object-cover"
          />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/15 text-3xl font-bold text-primary">
            {(user.name || "؟").charAt(0).toUpperCase()}
          </span>
        )}
        <div>
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
            <h2 className="font-semibold">الملف الشخصي</h2>
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
