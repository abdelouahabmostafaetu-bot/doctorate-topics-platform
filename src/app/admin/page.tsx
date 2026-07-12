import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "لوحة الإدارة",
};

export default async function AdminOverviewPage() {
  const session = await auth();

  const [topicCount, uniCount, specCount, userCount, openReports] =
    await Promise.all([
      prisma.topic.count(),
      prisma.university.count(),
      prisma.specialty.count(),
      prisma.user.count(),
      prisma.report.count({ where: { status: "open" } }),
    ]);

  // إحصاءات صغيرة — بدون صناديق كبيرة
  const stats: Array<{
    icon: string;
    label: string;
    value: number;
    href: string | null;
  }> = [
    { icon: "📄", label: "موضوع", value: topicCount, href: "/admin/topics" },
    {
      icon: "🏛️",
      label: "جامعة",
      value: uniCount,
      href: "/admin/duplicates#cleanup",
    },
    {
      icon: "🧭",
      label: "تخصص",
      value: specCount,
      href: "/admin/duplicates#cleanup",
    },
    { icon: "👥", label: "مستخدم", value: userCount, href: null },
    {
      icon: "🚩",
      label: "بلاغ مفتوح",
      value: openReports,
      href: "/admin/reports",
    },
  ];

  const quickLinks = [
    { icon: "➕", label: "موضوع جديد", href: "/admin/topics/new" },
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

      {/* أرقام سريعة — حبّات صغيرة */}
      <div className="mt-3 flex flex-wrap gap-2">
        {stats.map((s) => {
          const pill = (
            <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition hover:border-primary">
              <span>{s.icon}</span>
              <strong className="text-primary">{s.value}</strong>
              <span className="text-muted-foreground">{s.label}</span>
            </span>
          );
          return s.href ? (
            <Link key={s.label} href={s.href}>
              {pill}
            </Link>
          ) : (
            <span key={s.label}>{pill}</span>
          );
        })}
      </div>

      <div className="mt-5 h-px bg-gradient-to-l from-primary/40 via-border to-transparent" />

      {/* وصول سريع */}
      <h2 className="mt-4 text-sm font-bold">⚡ وصول سريع</h2>
      <div className="mt-2 flex flex-wrap gap-2">
        {quickLinks.map((l) => (
          <Link
            key={l.href + l.label}
            href={l.href}
            className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] text-muted-foreground transition hover:border-primary hover:text-primary"
          >
            {l.icon} {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
