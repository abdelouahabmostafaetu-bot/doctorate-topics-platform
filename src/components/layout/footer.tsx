import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-12 border-t">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 py-6 text-center text-sm text-muted-foreground">
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link href="/" className="transition hover:text-primary">
            الرئيسية
          </Link>
          <Link href="/search" className="transition hover:text-primary">
            المواضيع
          </Link>
          <Link href="/contribute" className="transition hover:text-primary">
            ساهم
          </Link>
          <Link href="/latex-guide" className="transition hover:text-primary">
            دليل LaTeX
          </Link>
          <Link href="/about" className="transition hover:text-primary">
            حول الموقع
          </Link>
          <Link href="/app" className="transition hover:text-primary">
            📱 حمّل التطبيق
          </Link>
          <Link href="/library" className="transition hover:text-primary">
            📖 بدون إنترنت
          </Link>
          <Link
            href="/coffee"
            className="text-amber-600 transition hover:text-amber-500 dark:text-amber-400 dark:hover:text-amber-300"
          >
            ☕ قهوة الدكتوراه
          </Link>
        </nav>
        <p>منصة أرشفة مواضيع مسابقات الدكتوراه في الرياضيات — الجزائر</p>
      </div>
    </footer>
  );
}
