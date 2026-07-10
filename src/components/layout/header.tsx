import Link from "next/link";
import { auth, signOut } from "@/auth";

export async function Header() {
  const session = await auth();
  const user = session?.user;
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  return (
    <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-bold text-primary">
          📚 مواضيع دكتوراه الرياضيات
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/" className="transition hover:text-primary">
            الرئيسية
          </Link>
          <Link
            href="/search"
            className="rounded-md bg-secondary px-3 py-1.5 font-medium text-secondary-foreground transition hover:bg-primary hover:text-primary-foreground"
          >
            بحث 🔍
          </Link>
          {isAdmin && (
            <Link href="/admin" className="transition hover:text-primary">
              الإدارة
            </Link>
          )}
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
