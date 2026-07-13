import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TopicCard } from "@/components/topic-card";
import { USERNAME_EMAIL_SUFFIX } from "@/lib/username";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "لوحتي الشخصية — منصة مواضيع دكتوراه الرياضيات",
};

// شارة إحصائية صغيرة بإطار جميل مختلف (حلقة متدرجة)
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

  const roleLabel =
    user.role === "ADMIN" || user.role === "SUPER_ADMIN"
      ? "🛡️ مدير الموقع"
      : user.userType === "teacher"
        ? "👨‍🏫 أستاذ"
        : "🎓 طالب";

  // الإحصائيات + المواضيع المحفوظة
  const [
    favorites,
    contribTotal,
    contribAccepted,
    reportsCount,
    solvedList,
    totalPublished,
  ] = await Promise.all([
    prisma.favorite.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contribution.count({ where: { userId: user.id } }),
    prisma.contribution.count({
      where: { userId: user.id, status: "accepted" },
    }),
    prisma.report.count({ where: { userId: user.id } }),
    prisma.topicProgress.findMany({
      where: { userId: user.id },
      orderBy: { doneAt: "desc" },
    }),
    prisma.topic.count({ where: { status: "published" } }),
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

  // المواضيع المحلولة — لقسم "تقدمي في الحل"
  const solvedTopicsRaw = solvedList.length
    ? await prisma.topic.findMany({
        where: {
          id: { in: solvedList.map((s) => s.topicId) },
          status: "published",
        },
        include: { university: true, specialty: true },
      })
    : [];
  const solvedTopics = solvedList
    .map((s) => solvedTopicsRaw.find((t) => t.id === s.topicId))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));
  const solvedPct = totalPublished
    ? Math.round((solvedTopics.length / totalPublished) * 100)
    : 0;

  const memberSince = new Intl.DateTimeFormat("ar-DZ", {
    year: "numeric",
    month: "long",
  }).format(user.createdAt);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* رأس بدون إطار: الصورة + الاسم + الصفة — وزر الإعدادات في الجهة المقابلة */}
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
            <h1 className="text-lg font-bold">{user.name}</h1>
            <p className="mt-0.5 text-xs font-medium text-primary">{roleLabel}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              <span dir="ltr">{displayHandle}</span> · عضو منذ {memberSince}
            </p>
          </div>
        </div>

        <Link
          href="/account/settings"
          title="إعدادات الحساب"
          className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
        >
          ⚙️ الإعدادات
        </Link>
      </div>

      {/* شارات صغيرة بجانب الصورة: النقاط والمساهمات المقبولة وغيرها */}
      <div className="mt-4 flex flex-wrap gap-2">
        <StatChip icon="🏆" value={user.points} label="نقطة" />
        <StatChip
          icon="🌱"
          value={contribAccepted + " / " + contribTotal}
          label="مساهمة مقبولة"
        />
        <StatChip icon="⭐" value={orderedTopics.length} label="موضوع محفوظ" />
        <StatChip icon="✅" value={solvedTopics.length} label="موضوع محلول" />
        <StatChip icon="🚨" value={reportsCount} label="بلاغ" />
      </div>

      {/* روابط سريعة صغيرة */}
      <div className="mt-3 flex flex-wrap gap-2">
        <QuickLink href="/contribute" icon="🌱" label="ساهم بموضوع" />
        <QuickLink href="/search" icon="🔍" label="تصفّح المواضيع" />
        <QuickLink href="/topics/random" icon="🎲" label="موضوع عشوائي" />
        <QuickLink href="/latex-guide" icon="📖" label="دليل LaTeX" />
      </div>

      {/* المواضيع المحفوظة */}
      <section className="mt-8">
        <div className="flex items-center gap-3">
          <h2 className="shrink-0 text-sm font-semibold">
            ⭐ مواضيعي المحفوظة ({orderedTopics.length})
          </h2>
          <div className="h-px flex-1 bg-gradient-to-l from-border to-transparent" />
        </div>
        {orderedTopics.length === 0 ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            لم تحفظ أي موضوع بعد — افتح أي موضوع واضغط “☆ حفظ الموضوع”{" "}
            ·{" "}
            <Link href="/search" className="text-primary hover:underline">
              تصفّح المواضيع ←
            </Link>
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orderedTopics.map((t) => (
              <TopicCard key={t.id} topic={t} />
            ))}
          </div>
        )}
      </section>

      {/* تقدمي في الحل — عنوان قابل للطي بسهم */}
      <section className="mt-8">
        <details className="group">
          <summary className="flex cursor-pointer select-none list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
            <h2 className="shrink-0 text-sm font-semibold">
              📈 تقدمي في الحل ({solvedTopics.length} / {totalPublished})
            </h2>
            <span className="h-px flex-1 bg-gradient-to-l from-border to-transparent" />
            <span className="text-[10px] text-muted-foreground transition-transform group-open:rotate-180">
              ▼
            </span>
          </summary>

          <div className="mt-4">
            {/* شريط التقدم */}
            <div className="h-2 overflow-hidden rounded-full bg-muted" dir="ltr">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all"
                style={ { width: solvedPct + "%" } }
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              أنهيت حل {solvedTopics.length} من أصل {totalPublished} موضوعًا
              منشورًا ({solvedPct}٪)
            </p>

            {solvedTopics.length === 0 ? (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                لم تعلّم أي موضوع كمحلول بعد — افتح أي موضوع واضغط “✓ تم
                الحل” بعد إنهائه
              </p>
            ) : (
              <>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {solvedTopics.slice(0, 12).map((t) => (
                    <TopicCard key={t.id} topic={t} />
                  ))}
                </div>
                {solvedTopics.length > 12 && (
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">
                    يظهر آخر 12 موضوعًا محلولًا فقط
                  </p>
                )}
              </>
            )}
          </div>
        </details>
      </section>
    </div>
  );
}
