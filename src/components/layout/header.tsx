import Link from "next/link";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ThemeToggle } from "@/components/layout/theme-toggle";

// ترويسة بسيطة جدًا: رمز الرئيسية على اليمين،
// وعلى اليسار: زر الوضع الداكن الصغير + عدد النقاط + صورة الحساب
export async function Header() {
  const session = await auth();
  const user = session?.user;
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  // صورة المستخدم ونقاطه — بشكل آمن (لا يُفشل الترويسة إطلاقًا)
  let avatar: string | null = null;
  let points = 0;
  if (user?.id) {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { image: true, points: true },
      });
      avatar = dbUser?.image ?? null;
      points = dbUser?.points ?? 0;
    } catch {
      avatar = null;
    }
  }

  const initial = (user?.name ?? user?.email ?? "؟").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur">
      <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4">
        {/* يمين (RTL): رمز صغير للعودة للرئيسية */}
        <Link
          href="/"
          title="الرئيسية"
          className="flex items-center gap-1.5 transition hover:opacity-80"
        >
          <span
            aria-hidden
            className="text-xl font-bold leading-none"
            style={{ fontFamily: "var(--font-math), 'STIX Two Text', serif" }}
          >
            ∂
          </span>{" "}
          <span className="text-xs font-semibold">الرئيسية</span>
        </Link>

        {/* يسار: الوضع الداكن + النقاط + الصورة */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isAdmin && (
            <Link
              href="/admin"
              title="لوحة الإدارة"
              className="rounded-full p-1 text-sm transition hover:bg-secondary"
            >
              ⚙️
            </Link>
          )}
          {user ? (
            <>
              {/* عدد النقاط — صغير جدًا أمام الصورة */}
              <span
                title="رصيدك من النقاط"
                className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary"
              >
                ⭐ {points}
              </span>
              {/* صورة الحساب — تفتح اللوحة الشخصية */}
              <Link href="/account" title="لوحتي الشخصية" className="shrink-0">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatar}
                    alt="الصورة الشخصية"
                    className="h-8 w-8 rounded-full border object-cover transition hover:ring-2 hover:ring-primary/50"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary transition hover:ring-2 hover:ring-primary/50">
                    {initial}
                  </span>
                )}
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  title="تسجيل الخروج"
                  aria-label="تسجيل الخروج"
                  className="rounded-full p-1 text-sm text-muted-foreground transition hover:bg-secondary hover:text-destructive"
                >
                  ⏻
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/signin"
              className="rounded-full border px-3 py-1 text-xs transition hover:border-primary hover:text-primary"
            >
              دخول
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
