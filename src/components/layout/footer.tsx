import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-12 border-t">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-4 py-6 text-center text-sm text-muted-foreground">
        <p>منصة أرشفة مواضيع مسابقات الدكتوراه في الرياضيات — الجزائر</p>
        <div className="flex gap-4 text-xs">
          <Link href="/status" className="hover:text-primary">
            حالة النظام
          </Link>
          <Link href="/changelog" className="hover:text-primary">
            آخر التحديدات
          </Link>
        </div>
      </div>
    </footer>
  );
}
