import Link from "next/link";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export async function Header() {
  const session = await auth();
  const user = session?.user;
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  // صورة المستخدم للقائمة العامة — بشكل آمن (لا يُفشل الترويسة إطلاقًا)
  let avatar: string | null = null;
  if (user?.id) {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { image: true },
      });
      avatar = dbUser?.image ?? null;
    } catch {
      avatar = null;
    }
  }

  const initial = (user?.name ?? user?.email ?? "؟").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur">
      <div className="mx-auto flex min-h-14 max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2">
        <Link href="/" className="font-bold text-primary">
          📚 مواضيع دكتوراه الرياضيات
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-2 text-sm sm:gap-3">
          <Link href="/" className="transition hover:text-primary">
            الرئيسية
          </Link>
          <Link
            href="/search"
            className="rounded-md bg-secondary px-3 py-1.5 font-medium text-secondary-foreground transition hover:bg-primary hover:text-primary-foreground"
          >
            المواضيع
          </Link>
          <Link href="/contribute" className="transition hover:text-primary">
            ساهم
          </Link>
          <Link href="/about" className="transition hover:text-primary">
            حول
          </Link>
          {isAdmin && (
            <Link href="/admin" className="transition hover:text-primary">
              الإدارة
            </Link>
          )}
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-2">
              {/* لوحة التحكم الشخصية مع الصورة */}
              <Link
                href="/account"
                title="لوحتي الشخصية"
                className="flex items-center gap-2 rounded-full border py-1 pe-3 ps-1 transition hover:border-primary hover:text-primary"
              >
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatar}
                    alt="الصورة الشخصية"
                    className="h-7 w-7 rounded-full border object-cover"
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                    {initial}
                  </span>
                )}
                <span className="hidden sm:inline">لوحتي</span>
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="rounded-md border px-3 py-1.5 transition hover:border-primary hover:text-primary"
                >
                  خروج
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/signin"
              className="rounded-md border px-3 py-1.5 transition hover:border-primary hover:text-primary"
            >
              دخول
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
