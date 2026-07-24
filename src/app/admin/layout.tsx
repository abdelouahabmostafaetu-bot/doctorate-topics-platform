import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMyAdminPerms } from "@/lib/admin-perms";

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

  const isSuper = role === "SUPER_ADMIN";
  // الأدمين العادي يرى فقط الميزات التي منحه إياها المدير الأعلى
  const { perms } = await getMyAdminPerms();

  const tabs = [
    { href: "/admin", label: "🏠 نظرة عامة", show: true },
    { href: "/admin/topics", label: "📄 المواضيع", show: isSuper },
    { href: "/admin/guide", label: "📚 زاد الباحث", show: isSuper },
    { href: "/admin/success-stories", label: "✨ تجارب الناجحين", show: isSuper },
    { href: "/admin/success-story-submissions", label: "📨 طلبات التجارب", show: isSuper },
    { href: "/admin/duplicates", label: "🔍 مقارنة وتنظيف", show: isSuper },
    { href: "/admin/latex-review", label: "✨ LaTeX", show: isSuper },
    { href: "/admin/import-json", label: "📦 استيراد JSON", show: isSuper },
    { href: "/admin/ai", label: "🧠 الذكاء الاصطناعي", show: isSuper },
    { href: "/admin/ai/usage", label: "📈 استخدام AI", show: isSuper },
    { href: "/admin/tips", label: "💡 النصائح", show: isSuper },
    { href: "/admin/contributions", label: "🌱 المساهمات", show: isSuper || perms.includes("contributions") },
    { href: "/admin/lecture-contributions", label: "📥 مساهمات الدروس", show: isSuper || perms.includes("contributions") },
    { href: "/admin/coffee-support", label: "☕ دعم المنصة", show: isSuper },
    { href: "/admin/reports", label: "🚩 البلاغات", show: isSuper },
    { href: "/admin/online", label: "🟢 المتصلون", show: isSuper || perms.includes("online") },
    { href: "/admin/users", label: "👥 المستخدمون", show: isSuper },
    { href: "/admin/lectures", label: "📚 المحاضرات", show: isSuper || perms.includes("lectures") },
    { href: "/admin/universities", label: "🏛️ الجامعات", show: isSuper || perms.includes("lectures") },
    { href: "/admin/admins", label: "🛡️ الأدمن والصلاحيات", show: isSuper },
  ].filter((t) => t.show);

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
