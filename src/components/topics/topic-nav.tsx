import Link from "next/link";

// أسهم التنقل بين المواضيع ضمن الفلترة الحالية
// حاسوب: سهمان ثابتان على جانبي الشاشة — هاتف: شريط أسفل الموضوع
export type TopicNavLink = { href: string; label: string } | null;

const sideClass =
  "fixed top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border bg-background/90 text-lg shadow-md backdrop-blur transition hover:scale-105 hover:border-primary hover:text-primary lg:flex";

export function TopicNav({
  prev,
  next,
}: {
  prev: TopicNavLink;
  next: TopicNavLink;
}) {
  if (!prev && !next) return null;
  return (
    <>
      {/* حاسوب — RTL: السابق على اليمين والتالي على اليسار */}
      {prev && (
        <Link
          href={prev.href}
          title={"الموضوع السابق: " + prev.label}
          className={sideClass + " right-3"}
        >
          →
        </Link>
      )}
      {next && (
        <Link
          href={next.href}
          title={"الموضوع التالي: " + next.label}
          className={sideClass + " left-3"}
        >
          ←
        </Link>
      )}

      {/* هاتف — أسفل الموضوع */}
      <div className="mt-6 flex items-center justify-between gap-2 border-t pt-4 lg:hidden">
        {prev ? (
          <Link
            href={prev.href}
            className="flex min-w-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition hover:border-primary hover:text-primary"
          >
            <span>→</span>
            <span className="min-w-0">
              <span className="block text-[9px] text-muted-foreground">
                السابق
              </span>
              <span className="block max-w-36 truncate">{prev.label}</span>
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={next.href}
            className="flex min-w-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition hover:border-primary hover:text-primary"
          >
            <span className="min-w-0 text-end">
              <span className="block text-[9px] text-muted-foreground">
                التالي
              </span>
              <span className="block max-w-36 truncate">{next.label}</span>
            </span>
            <span>←</span>
          </Link>
        ) : (
          <span />
        )}
      </div>
    </>
  );
}
