import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") redirect("/");

  // لا استعلام قاعدة بيانات هنا — يبقى هيكل الإدارة آمنًا من الأعطال
  const tabs = [
    { href: "/admin", label: "🏠 نظرة عامة" },
    { href: "/admin/topics", label: "📄 المواضيع" },
    { href: "/admin/duplicates", label: "🔍 مقارنة وتنظيف" },
    { href: "/admin/latex-review", label: "✨ LaTeX" },
    { href: "/admin/import-json", label: "📦 استيراد JSON" },
    { href: "/admin/ai", label: "🧠 الذكاء الاصطناعي" },
    { href: "/admin/contributions", label: "🌱 المساهمات" },
    { href: "/admin/reports", label: "🚩 البلاغات" },
    { href: "/admin/online", label: "🟢 المتصلون" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-base font-bold">⚙️ لوحة الإدارة</h1>
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
          {role === "SUPER_ADMIN" ? "🛡️ مدير أعلى" : "🛡️ مدير"}
        </span>
      </div>
      <nav className="mt-3 flex flex-wrap gap-1 border-b pb-2 text-xs">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="rounded-full px-2.5 py-1 transition hover:bg-secondary hover:text-secondary-foreground"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="mt-4">{children}</div>
    </div>
  );
}
