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
          <Link href="/about" className="transition hover:text-primary">
            حول الموقع
          </Link>
          <Link href="/status" className="transition hover:text-primary">
            حالة الخدمات
          </Link>
          <Link href="/changelog" className="transition hover:text-primary">
            سجل التغييرات
          </Link>
        </nav>
        <p>منصة أرشفة مواضيع مسابقات الدكتوراه في الرياضيات — الجزائر</p>
      </div>
    </footer>
  );
}
