import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const revalidate = 3600; // ISR — تتجدد الصفحة كل ساعة (قرار AD-03)

export default async function HomePage() {
  const [latestTopics, topContributors, acceptedCount, latestSuccessStories] =
    await Promise.all([
      prisma.topic.findMany({
        where: { status: "published" },
        orderBy: [{ year: "desc" }, { createdAt: "desc" }],
        take: 3,
        include: { university: true, specialty: true },
      }),
      prisma.user
        .findMany({
          where: { points: { gt: 0 } },
          orderBy: { points: "desc" },
          take: 5,
          select: { id: true, name: true, image: true, points: true },
        })
        .catch(
          () =>
            [] as Array<{
              id: string;
              name: string;
              image: string | null;
              points: number;
            }>,
        ),
      prisma.contribution
        .count({ where: { status: "accepted" } })
        .catch(() => 0),
      prisma.successStory.findMany({
        where: { published: true },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { _count: { select: { likes: true } } },
      }),
    ]);

  const [first, ...rest] = topContributors;
  const [featuredStory, ...otherStories] = latestSuccessStories;

  // بيانات منظمة (JSON-LD) — تعريف الموقع لمحركات البحث
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "DocMath DZ",
    alternateName: "منصة مواضيع دكتوراه الرياضيات في الجزائر",
    url: "https://www.docmathdz.dev",
    inLanguage: "ar",
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* بيانات منظمة لمحركات البحث */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      {/* العنوان الرئيسي للمنصة */}
      <section className="text-center">
        <h1 className="text-3xl font-bold leading-relaxed md:text-4xl">
          <span className="text-foreground">أرشيف مواضيع</span>{" "}
          <span className="text-primary">مسابقات الدكتوراه</span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          أرشيف مواضيع مسابقات الالتحاق بالدكتوراه في الرياضيات — نصوص التمارين
          كاملة بعرض رياضي واضح، مع بحث وتصفية حسب الجامعة والسنة والتخصص
        </p>

        {/* Mathora — المساعد الذكي: مدخل رئيسي أنيق وسط الواجهة */}
        <div className="mx-auto mt-7 max-w-xl" dir="rtl">
          <Link
            href="/mathora"
            className="group flex items-center gap-3 rounded-2xl border border-black/10 bg-gradient-to-b from-[#fafafa] to-[#ececee] px-4 py-3 text-start shadow-[0_2px_14px_rgba(0,0,0,0.07)] ring-1 ring-white/60 transition hover:-translate-y-0.5 hover:shadow-[0_10px_32px_rgba(0,0,0,0.12)] dark:border-white/10 dark:from-[#2c2c30] dark:to-[#1f1f23] dark:ring-white/5"
          >
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-sm ring-1 ring-black/10 dark:ring-white/15" style={{ background: "linear-gradient(145deg, #f5f5f5 0%, #d4d4d4 45%, #a3a3a3 100%)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-light.png" alt="" width={40} height={40} className="h-full w-full object-cover dark:hidden" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-dark.png" alt="" width={40} height={40} className="hidden h-full w-full object-cover dark:block" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="text-[15px] font-bold tracking-tight text-[#27272a] dark:text-[#f4f4f5]" dir="ltr">Mathora</span>
                <span className="rounded-full bg-gradient-to-r from-[#e5e5e5] to-[#cfcfcf] px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-[#52525b] dark:from-[#3f3f46] dark:to-[#27272a] dark:text-[#a1a1aa]">AI</span>
              </span>
              <span className="mt-0.5 block truncate text-[12.5px] text-muted-foreground">
                اسأل عن أي امتحان — «امتحانات عنابة 2023» — واحصل على الرابط مباشرة
              </span>
            </span>
            <span className="flex h-8 shrink-0 items-center rounded-full bg-gradient-to-b from-[#f4f4f5] to-[#d4d4d8] px-3.5 text-[12px] font-bold text-[#3f3f46] ring-1 ring-black/10 transition group-hover:from-white group-hover:to-[#cfcfd4] dark:from-[#e8e8e8] dark:to-[#cfcfcf] dark:text-[#191919] dark:ring-white/5" dir="ltr">
              → ابدأ
            </span>
          </Link>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/search"
            className="group flex items-center gap-2.5 rounded-full bg-primary px-5 py-2.5 font-medium text-primary-foreground shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-sm transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-[12deg]">
              🔍
            </span>
            تصفّح المواضيع
          </Link>
          <Link
            href="/contribute"
            className="group flex items-center gap-2.5 rounded-full border border-emerald-400/50 bg-white px-5 py-2.5 font-medium text-emerald-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/15 dark:bg-transparent dark:text-emerald-400"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-sm transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-[12deg]">
              🌱
            </span>
            ساهم
          </Link>
          <Link
            href="/coffee"
            className="group flex items-center gap-2.5 rounded-full border border-amber-400/50 bg-white px-5 py-2.5 font-medium text-amber-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/15 dark:bg-transparent dark:text-amber-400"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/10 text-sm transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-[12deg]">
              ☕
            </span>
            قهوة الدكتوراه
          </Link>
          <Link
            href="/guide"
            className="group flex items-center gap-2.5 rounded-full border border-primary/40 bg-white px-5 py-2.5 font-medium text-primary shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:shadow-lg hover:shadow-primary/15 dark:bg-transparent"
          >
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-[12deg]"
              style={{ fontFamily: "var(--font-math), 'STIX Two Text', serif" }}
            >
              ∂
            </span>
            زاد الباحث
          </Link>
        </div>
      </section>

      {featuredStory && (
        <section
          className="mt-12 border-y border-slate-200 py-7 dark:border-border sm:mt-16 sm:py-10"
          dir="rtl"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-px w-6 bg-current/60" />
                <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground">
                  من الطريق إلى الدكتوراه
                </p>
              </div>
              <h2 className="mt-2 text-lg font-bold tracking-tight sm:text-xl">
                تجارب تستحق أن تُروى
              </h2>
            </div>
            <Link
              href="/guide/success-stories"
              className="text-[11px] font-semibold text-primary transition hover:underline"
            >
              أرشيف التجارب ←
            </Link>
          </div>

          <article className="mt-6 border-r-2 border-primary/70 pr-4 sm:mt-8 sm:pr-6">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
              <span className="font-semibold text-foreground/80">
                تجربة مختارة
              </span>
              <span>·</span>
              <span>{featuredStory.name || "باحث/ة ناجح/ة"}</span>
              {featuredStory.university && (
                <span>· {featuredStory.university}</span>
              )}
              {featuredStory.year && <span>· {featuredStory.year}</span>}
            </div>
            <h3 className="mt-2 max-w-3xl text-base font-bold leading-7 sm:text-xl sm:leading-8">
              {featuredStory.title}
            </h3>
            <p className="mt-2 max-w-3xl text-xs leading-6 text-muted-foreground sm:text-sm sm:leading-7">
              {featuredStory.excerpt}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px]">
              <Link
                href={`/guide/success-stories/${featuredStory.slug}`}
                className="font-semibold text-primary transition hover:underline"
              >
                اقرأ التجربة كاملة ←
              </Link>
              <span className="text-muted-foreground">
                {featuredStory.viewCount} قراءة
              </span>
              <span className="text-muted-foreground">
                {featuredStory._count.likes} إعجاب
              </span>
            </div>
          </article>

          {otherStories.length > 0 && (
            <div className="mt-6 border-t border-slate-200 dark:border-border sm:mt-8">
              {otherStories.map((story) => (
                <Link
                  key={story.id}
                  href={`/guide/success-stories/${story.slug}`}
                  className="group flex items-center gap-3 border-b border-slate-200 py-3.5 transition hover:bg-muted/30 dark:border-border sm:gap-4 sm:py-4"
                >
                  <span className="shrink-0 text-lg font-serif text-primary/60">
                    ✦
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-bold leading-6 transition group-hover:text-primary sm:text-sm">
                      {story.title}
                    </h3>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {story.name || "باحث/ة ناجح/ة"}
                      {story.university ? ` · ${story.university}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold text-primary">
                    اقرأ ←
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="mt-12">
        <h2 className="text-xl font-semibold">أحدث المواضيع</h2>
        {/* ثلاثة مواضيع فقط — بدون صناديق، مع خط فاصل جميل بين كل موضوعين */}
        <div className="mt-2">
          {latestTopics.map((t, i) => (
            <div key={t.id}>
              {i > 0 && (
                <div
                  aria-hidden
                  className="h-px bg-gradient-to-l from-transparent via-primary/40 to-transparent"
                />
              )}
              <Link href={`/topics/${t.slug}`} className="group block py-4">
                <h3 className="font-semibold transition group-hover:text-primary">
                  {t.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  🏛️ {t.university.nameAr} · 🎓 {t.specialty.nameAr} · 📅{" "}
                  {t.year}
                </p>
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">🏆 أفضل المساهمين</h2>
          <Link
            href="/contributors"
            className="text-sm text-primary underline-offset-2 hover:underline"
          >
            عرض اللوحة كاملة ←
          </Link>
        </div>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          هذا الموقع يكبر بفضل مساهماتكم. حتى الآن تم قبول{" "}
          <strong>{acceptedCount}</strong> مساهمة.
        </p>
        {first ? (
          /* شكل هرمي: أكبر مساهم في القمة، ثم البقية في سطر ثانٍ */
          <div className="mt-5 flex flex-col items-center gap-5">
            <div className="flex flex-col items-center">
              <span className="text-lg">🥇</span>
              {first.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={first.image}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover ring-2 ring-amber-400"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-sm font-bold ring-2 ring-amber-400">
                  {(first.name || "?")[0]}
                </div>
              )}
              <span className="mt-1 max-w-32 truncate text-sm font-semibold">
                {first.name}
              </span>
              <span className="text-xs font-bold text-primary">
                ⭐ {first.points}
              </span>
            </div>
            {rest.length > 0 && (
              <div className="flex flex-wrap items-start justify-center gap-6">
                {rest.map((u, i) => (
                  <div key={u.id} className="flex flex-col items-center">
                    <span className="text-sm">
                      {i === 0 ? "🥈" : i === 1 ? "🥉" : "⭐"}
                    </span>
                    {u.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={u.image}
                        alt=""
                        className="h-8 w-8 rounded-full border object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-secondary text-xs">
                        {(u.name || "?")[0]}
                      </div>
                    )}
                    <span className="mt-0.5 max-w-24 truncate text-xs font-medium">
                      {u.name}
                    </span>
                    <span className="text-[10px] font-bold text-primary">
                      ⭐ {u.points}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            لا يوجد مساهمون بعد.
          </p>
        )}
        <p className="mt-4 text-center text-sm text-muted-foreground">
          تريد الظهور هنا؟{" "}
          <Link
            href="/contribute"
            className="text-primary underline-offset-2 hover:underline"
          >
            ساهم بموضوع أو حل من هنا 🌱
          </Link>
        </p>
      </section>
    </div>
  );
}
