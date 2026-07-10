import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") redirect("/");

  const tabs = [
    { href: "/admin", label: "نظرة عامة" },
    { href: "/admin/topics", label: "المواضيع" },
    { href: "/admin/universities", label: "الجامعات" },
    { href: "/admin/reports", label: "البلاغات" },
    ...(role === "SUPER_ADMIN"
      ? [
          { href: "/admin/status", label: "حالة النظام" },
          { href: "/admin/changelog", label: "التحديثات" },
          { href: "/admin/monitoring", label: "المراقبة" },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">لوحة الإدارة</h1>
        <span className="rounded-md bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          {role === "SUPER_ADMIN" ? "مدير أعلى" : "مدير"}
        </span>
      </div>
      <nav className="mt-4 flex gap-1 border-b pb-2 text-sm">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="rounded-md px-3 py-1.5 transition hover:bg-secondary hover:text-secondary-foreground"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
