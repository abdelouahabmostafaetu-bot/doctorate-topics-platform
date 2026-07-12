"use client";

import { useRouter } from "next/navigation";

type Option = { slug: string; nameAr: string };

type Current = { q: string; university: string; specialty: string; year: string };

// فلاتر صغيرة بدون صناديق — تُطبّق فورًا عند الاختيار (مع الحفاظ على كلمة البحث)
const selectClass =
  "max-w-[44vw] cursor-pointer appearance-none border-0 border-b border-border bg-transparent px-1 py-1 text-xs text-foreground transition focus:border-primary focus:outline-none sm:max-w-none sm:text-sm";

export function FilterBar({
  universities,
  specialties,
  years,
  current,
}: {
  universities: Option[];
  specialties: Option[];
  years: number[];
  current: Current;
}) {
  const router = useRouter();

  function apply(key: keyof Current, value: string) {
    const next = { ...current, [key]: value };
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.university) params.set("university", next.university);
    if (next.specialty) params.set("specialty", next.specialty);
    if (next.year) params.set("year", next.year);
    const qs = params.toString();
    router.push(qs ? `/search?${qs}` : "/search");
  }

  const hasAny = Boolean(
    current.q || current.university || current.specialty || current.year,
  );

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <select
        value={current.university}
        onChange={(e) => apply("university", e.target.value)}
        className={selectClass}
        aria-label="الجامعة"
      >
        <option value="">🏛️ كل الجامعات</option>
        {universities.map((u) => (
          <option key={u.slug} value={u.slug}>
            {u.nameAr}
          </option>
        ))}
      </select>

      <select
        value={current.specialty}
        onChange={(e) => apply("specialty", e.target.value)}
        className={selectClass}
        aria-label="التخصص"
      >
        <option value="">🧭 كل التخصصات</option>
        {specialties.map((s) => (
          <option key={s.slug} value={s.slug}>
            {s.nameAr}
          </option>
        ))}
      </select>

      <select
        value={current.year}
        onChange={(e) => apply("year", e.target.value)}
        className={selectClass}
        aria-label="السنة"
      >
        <option value="">📅 كل السنوات</option>
        {years.map((y) => (
          <option key={y} value={String(y)}>
            {y}
          </option>
        ))}
      </select>

      {hasAny && (
        <button
          type="button"
          onClick={() => router.push("/search")}
          className="text-[11px] text-muted-foreground transition hover:text-destructive"
        >
          ✕ مسح
        </button>
      )}
    </div>
  );
}
