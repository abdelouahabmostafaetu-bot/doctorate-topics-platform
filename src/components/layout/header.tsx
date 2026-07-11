import Link from "next/link";
import { auth, signOut } from "@/auth";
import { ThemeToggle } from "@/components/theme-toggle";

export async function Header() {
  const session = await auth();
  const user = session?.user;
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

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
          <Link href="/about" className="transition hover:text-primary">
            حول الموقع
          </Link>
          {isAdmin && (
            <Link href="/admin" className="transition hover:text-primary">
              الإدارة
            </Link>
          )}
          <ThemeToggle />
          {user ? (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
              className="flex items-center gap-2"
            >
              <Link
                href="/account"
                className="hidden text-muted-foreground transition hover:text-primary sm:inline"
              >
                {user.name ?? user.email}
              </Link>
              <button
                type="submit"
                className="rounded-md border px-3 py-1.5 transition hover:border-primary hover:text-primary"
              >
                خروج
              </button>
            </form>
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
