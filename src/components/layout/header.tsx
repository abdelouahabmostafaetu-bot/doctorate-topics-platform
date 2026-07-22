import Link from "next/link";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ThemeToggle } from "@/components/layout/theme-toggle";

// أيقونات SVG احترافية موحّدة الأسلوب (خطوط واضحة — بدون رموز تعبيرية)
const iconProps = {
  width: 17,
  height: 17,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function BookOpenIcon() {
  return (
    <svg {...iconProps}>
      <path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z" />
      <path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function BookmarkCheckIcon() {
  return (
    <svg {...iconProps}>
      <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      <path d="M9 10l2 2 4-4" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      width={11}
      height={11}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      aria-hidden
    >
      <path d="M12 2l2.94 6.26 6.56.84-4.83 4.62 1.24 6.48L12 17.02 6.09 20.2l1.24-6.48L2.5 9.1l6.56-.84z" />
    </svg>
  );
}

function LogOutIcon() {
  return (
    <svg {...iconProps} width={16} height={16}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

// ترويسة بسيطة: رمز الرئيسية على اليمين،
// وعلى اليسار: دليل + مراجعتي + إدارة + نقاط + صورة
export async function Header() {
  const session = await auth();
  const user = session?.user;
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  // صورة المستخدم ونقاطه — بشكل آمن (لا يُفشل الترويسة إطلاقاً)
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

        {/* يسار: الوضع الداكن + زاد الباحث + مراجعتي + إدارة + النقاط + الصورة */}
        <div className="flex items-center gap-1">
          <ThemeToggle />

          {/* زاد الباحث — ظاهر للجميع */}
          <Link
            href="/guide"
            title="زاد الباحث — نصائح وإرشادات"
            className="rounded-full p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <BookOpenIcon />
          </Link>

          <Link
            href="/revision"
            title="مراجعتي — تقدمك في المراجعة"
            className="rounded-full p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <BookmarkCheckIcon />
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              title="لوحة الإدارة"
              className="rounded-full p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              <SettingsIcon />
            </Link>
          )}
          {user ? (
            <>
              {/* عدد النقاط — صغير جداً أمام الصورة */}
              <span
                title="رصيدك من النقاط"
                className="mx-1 flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary"
              >
                <StarIcon />
                {points}
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
                  className="rounded-full p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-destructive"
                >
                  <LogOutIcon />
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
