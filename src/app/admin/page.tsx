import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "لوحة الإدارة",
};

export default async function AdminOverviewPage() {
  const session = await auth();
  const isSuper = session?.user?.role === "SUPER_ADMIN";

  const [
    topicCount,
    uniCount,
    specCount,
    userCount,
    openReports,
    coffeeViews,
    coffeeCopies,
  ] = await Promise.all([
    prisma.topic.count(),
    prisma.university.count(),
    prisma.specialty.count(),
    prisma.user.count(),
    prisma.report.count({ where: { status: "open" } }),
    isSuper
      ? prisma.counter
          .findUnique({ where: { key: "coffee_view" } })
          .then((counter) => counter?.value ?? 0)
          .catch(() => 0)
      : Promise.resolve(0),
    isSuper
      ? prisma.counter
          .findUnique({ where: { key: "coffee_copy" } })
          .then((counter) => counter?.value ?? 0)
          .catch(() => 0)
      : Promise.resolve(0),
  ]);

  const stats = [
    { icon: "📄", label: "موضوع", value: topicCount, href: "/admin/topics", superOnly: false },
    { icon: "🏛️", label: "جامعة", value: uniCount, href: "/admin/duplicates#cleanup", superOnly: true },
    { icon: "🧭", label: "تخصص", value: specCount, href: "/admin/duplicates#cleanup", superOnly: true },
    { icon: "👥", label: "مستخدم", value: userCount, href: null, superOnly: false },
    { icon: "🚩", label: "بلاغ مفتوح", value: openReports, href: "/admin/reports", superOnly: true },
    { icon: "☕", label: "زيارة لصفحة القهوة", value: coffeeViews, href: "/coffee", superOnly: true },
    { icon: "📋", label: "نسخ حساب CCP", value: coffeeCopies, href: "/coffee", superOnly: true },
  ].filter((stat) => isSuper || !stat.superOnly);

  const quickLinks = [
    { icon: "➕", label: "موضوع جديد", href: "/admin/topics/new" },
    { icon: "☕", label: "قهوة اليوم — مسألة ومقولة", href: "/admin/coffee" },
    { icon: "🔍", label: "كشف التكرار", href: "/admin/duplicates" },
    { icon: "🧹", label: "تنظيف التصنيفات", href: "/admin/duplicates#cleanup" },
    { icon: "🌱", label: "مراجعة المساهمات", href: "/admin/contributions" },
    { icon: "🚩", label: "البلاغات", href: "/admin/reports" },
    { icon: "📈", label: "المراقبة", href: "/admin/monitoring" },
    { icon: "🩺", label: "حالة الموقع", href: "/admin/status" },
    { icon: "📝", label: "سجل التغييرات", href: "/admin/changelog" },
  ];

  return (
    <div>
      <p className="text-xs text-muted-foreground">
        مرحبًا {session?.user?.name ?? session?.user?.email} 👋
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {stats.map((stat) => {
          const pill = (
            <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition hover:border-primary">
              <span>{stat.icon}</span>
              <strong className="text-primary">{stat.value}</strong>
              <span className="text-muted-foreground">{stat.label}</span>
            </span>
          );
          return stat.href ? (
            <Link key={stat.label} href={stat.href}>
              {pill}
            </Link>
          ) : (
            <span key={stat.label}>{pill}</span>
          );
        })}
      </div>

      {isSuper && (
        <>
          <div className="mt-5 h-px bg-gradient-to-l from-primary/40 via-border to-transparent" />
          <h2 className="mt-4 text-sm font-bold">⚡ وصول سريع</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {quickLinks.map((link) => (
              <Link
                key={link.href + link.label}
                href={link.href}
                className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] text-muted-foreground transition hover:border-primary hover:text-primary"
              >
                {link.icon} {link.label}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
