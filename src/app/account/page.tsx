import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  BookOpen,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  CircleUserRound,
  FilePlus2,
  Flag,
  GraduationCap,
  Search,
  Settings2,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TopicCard } from "@/components/topic-card";
import { USERNAME_EMAIL_SUFFIX } from "@/lib/username";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "لوحتي الشخصية — منصة مواضيع دكتوراه الرياضيات",
};

type IconType = typeof Activity;

function MetricCard({
  icon: Icon,
  value,
  label,
  hint,
}: {
  icon: IconType;
  value: number | string;
  label: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 transition-colors hover:bg-muted/35">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1 text-sm font-medium">{label}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}

function ActionCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: IconType;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-24 items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors group-hover:text-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2 text-sm font-semibold">
          {title}
          <ChevronLeft className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
        </span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
          {description}
        </span>
      </span>
    </Link>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: IconType;
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        )}
      </div>
      {action && (
        <Link href={action.href} className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline">
          {action.label}
        </Link>
      )}
    </div>
  );
}

export default async function AccountPage() {
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
    ? "مدير الموقع"
    : user.userType === "teacher"
      ? "أستاذ"
      : "طالب";

  const [
    favorites,
    contribTotal,
    contribAccepted,
    reportsCount,
    solvedList,
    totalPublished,
    recentActivities,
  ] = await Promise.all([
    prisma.favorite.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contribution.count({ where: { userId: user.id } }),
    prisma.contribution.count({ where: { userId: user.id, status: "accepted" } }),
    prisma.report.count({ where: { userId: user.id } }),
    prisma.topicProgress.findMany({
      where: { userId: user.id },
      orderBy: { doneAt: "desc" },
    }),
    prisma.topic.count({ where: { status: "published" } }),
    prisma.userActivity.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const favoriteTopics = favorites.length
    ? await prisma.topic.findMany({
        where: { id: { in: favorites.map((item) => item.topicId) }, status: "published" },
        include: { university: true, specialty: true },
      })
    : [];
  const orderedTopics = favorites
    .map((item) => favoriteTopics.find((topic) => topic.id === item.topicId))
    .filter((topic): topic is NonNullable<typeof topic> => Boolean(topic));

  const solvedTopicsRaw = solvedList.length
    ? await prisma.topic.findMany({
        where: { id: { in: solvedList.map((item) => item.topicId) }, status: "published" },
        include: { university: true, specialty: true },
      })
    : [];
  const solvedTopics = solvedList
    .map((item) => solvedTopicsRaw.find((topic) => topic.id === item.topicId))
    .filter((topic): topic is NonNullable<typeof topic> => Boolean(topic));

  const solvedPct = totalPublished
    ? Math.min(100, Math.round((solvedTopics.length / totalPublished) * 100))
    : 0;
  const acceptancePct = contribTotal
    ? Math.round((contribAccepted / contribTotal) * 100)
    : 0;
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const solvedThisWeek = solvedList.filter((item) => item.doneAt >= weekStart).length;
  const nextPointsGoal = Math.max(100, Math.ceil((user.points + 1) / 100) * 100);
  const pointsGoalPct = Math.min(100, Math.round((user.points / nextPointsGoal) * 100));

  const memberSince = new Intl.DateTimeFormat("ar-DZ", {
    year: "numeric",
    month: "long",
  }).format(user.createdAt);
  const dateFormatter = new Intl.DateTimeFormat("ar-DZ", {
    day: "numeric",
    month: "short",
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <nav className="mb-6 flex items-center gap-2 text-xs text-muted-foreground" aria-label="مسار الصفحة">
        <Link href="/" className="hover:text-foreground">الرئيسية</Link>
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="text-foreground">لوحتي الشخصية</span>
      </nav>

      <header className="border-b pb-7">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div className="flex min-w-0 items-center gap-4">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt="الصورة الشخصية" className="h-16 w-16 rounded-xl object-cover ring-1 ring-border" />
            ) : (
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl font-semibold text-foreground ring-1 ring-border">
                {(user.name || "؟").charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{user.name}</h1>
                {isAdmin && <ShieldCheck className="h-5 w-5 text-primary" aria-label="حساب إداري" />}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{roleLabel}</span>
                <span className="mx-2">·</span>
                <span dir="ltr">{displayHandle}</span>
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                عضو منذ {memberSince}
              </p>
            </div>
          </div>
          <Link
            href="/account/settings"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Settings2 className="h-4 w-4" aria-hidden="true" />
            إعدادات الحساب
          </Link>
        </div>
      </header>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Trophy} value={user.points} label="النقاط" hint={`${nextPointsGoal - user.points} نقطة للهدف القادم`} />
        <MetricCard icon={CheckCircle2} value={solvedTopics.length} label="موضوع محلول" hint={`${solvedThisWeek} خلال آخر 7 أيام`} />
        <MetricCard icon={Bookmark} value={orderedTopics.length} label="موضوع محفوظ" hint="قائمة مراجعتك الشخصية" />
        <MetricCard icon={FilePlus2} value={`${contribAccepted}/${contribTotal}`} label="مساهمات مقبولة" hint={contribTotal ? `نسبة قبول ${acceptancePct}٪` : "ابدأ بأول مساهمة"} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]">
        <div className="min-w-0 space-y-8">
          <section>
            <SectionHeading icon={Sparkles} title="ابدأ من هنا" description="اختصارات مرتبة لأهم ما تحتاجه في المنصة" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <ActionCard href="/search" icon={Search} title="تصفّح المواضيع" description="ابحث حسب الجامعة والتخصص والسنة." />
              <ActionCard href="/revision" icon={BookOpen} title="واصل المراجعة" description="ارجع إلى المواضيع التي أنهيتها ونظّم تقدمك." />
              <ActionCard href="/topics/random" icon={Shuffle} title="تحدٍ عشوائي" description="اختر موضوعًا عشوائيًا وابدأ جلسة تدريب جديدة." />
              <ActionCard href="/contribute" icon={FilePlus2} title="ساهم بموضوع" description="أضف مادة مفيدة واحصل على نقاط عند قبولها." />
            </div>
          </section>

          <section>
            <SectionHeading
              icon={Bookmark}
              title={`مواضيعي المحفوظة (${orderedTopics.length})`}
              description="المواضيع التي تريد العودة إليها لاحقًا"
              action={{ href: "/search", label: "استكشف المزيد" }}
            />
            {orderedTopics.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed p-8 text-center">
                <Bookmark className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium">لا توجد مواضيع محفوظة بعد</p>
                <p className="mt-1 text-xs text-muted-foreground">افتح أي موضوع واضغط على حفظ لبناء قائمة مراجعتك.</p>
                <Link href="/search" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
                  تصفّح المواضيع <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {orderedTopics.slice(0, 6).map((topic) => <TopicCard key={topic.id} topic={topic} />)}
              </div>
            )}
          </section>

          <section>
            <SectionHeading icon={CheckCircle2} title="آخر المواضيع المحلولة" description="آخر إنجازاتك في التدريب والمراجعة" action={{ href: "/revision", label: "فتح صفحة المراجعة" }} />
            {solvedTopics.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed p-7 text-center text-sm text-muted-foreground">
                علّم الموضوع كـ «تم الحل» بعد إنهائه وسيظهر هنا.
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {solvedTopics.slice(0, 4).map((topic) => <TopicCard key={topic.id} topic={topic} />)}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-xl border bg-card p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Target className="h-4 w-4 text-primary" aria-hidden="true" />
              تقدمي
            </h2>
            <div className="mt-5 space-y-5">
              <div>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium">حل المواضيع</span>
                  <span className="text-muted-foreground">{solvedPct}٪</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" dir="ltr">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${solvedPct}%` }} />
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{solvedTopics.length} من أصل {totalPublished} موضوعًا منشورًا</p>
              </div>
              <div>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium">الهدف التالي</span>
                  <span className="text-muted-foreground">{user.points}/{nextPointsGoal}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" dir="ltr">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pointsGoalPct}%` }} />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              آخر النشاطات
            </h2>
            {recentActivities.length === 0 ? (
              <p className="mt-4 text-xs leading-5 text-muted-foreground">سيظهر سجل نشاطك هنا عند تصفح المواضيع أو تحميلها.</p>
            ) : (
              <ol className="mt-4 space-y-1">
                {recentActivities.map((item) => (
                  <li key={item.id}>
                    <Link href={item.path} className="flex min-h-11 items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted">
                      <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        {item.action === "download" ? <BookOpen className="h-3.5 w-3.5" /> : <CircleUserRound className="h-3.5 w-3.5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium">{item.label || (item.action === "download" ? "تحميل ملف" : "زيارة صفحة")}</span>
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">{dateFormatter.format(item.createdAt)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="rounded-xl border bg-muted/30 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Flag className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              ملخص الحساب
            </h2>
            <dl className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">نوع الحساب</dt><dd className="font-medium">{roleLabel}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">البلاغات المرسلة</dt><dd className="font-medium">{reportsCount}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">الانضمام</dt><dd className="font-medium">{memberSince}</dd></div>
            </dl>
            <Link href="/account/settings" className="mt-5 flex min-h-11 items-center justify-between rounded-lg border bg-background px-3 text-xs font-medium hover:bg-muted">
              إدارة الحساب <Settings2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </Link>
          </section>
        </aside>
      </div>
    </main>
  );
}
