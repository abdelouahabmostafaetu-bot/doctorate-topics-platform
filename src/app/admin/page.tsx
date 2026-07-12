import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "لوحة الإدارة",
};

export default async function AdminOverviewPage() {
  const session = await auth();

  const [topicCount, uniCount, userCount, openReports] = await Promise.all([
    prisma.topic.count(),
    prisma.university.count(),
    prisma.user.count(),
    prisma.report.count({ where: { status: "open" } }),
  ]);

  const stats: Array<{ label: string; value: number; href: string | null }> = [
    { label: "المواضيع", value: topicCount, href: "/admin/topics" },
    { label: "الجامعات", value: uniCount, href: "/admin/universities" },
    { label: "المستخدمون", value: userCount, href: null },
    { label: "بلا٢ات مفتوحة", value: openReports, href: "/admin/reports" },
  ];

  return (
    <div>
      <p className="text-muted-foreground">
        مرحبًا {session?.user?.name ?? session?.user?.email} 👋
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const card = (
            <div className="rounded-lg border bg-card p-5 text-center transition hover:border-primary">
              <div className="text-3xl font-bold text-primary">{s.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {s.label}
              </div>
            </div>
          );
          return s.href ? (
            <Link key={s.label} href={s.href}>
              {card}
            </Link>
          ) : (
            <div key={s.label}>{card}</div>
          );
        })}
      </div>
    </div>
  );
}
