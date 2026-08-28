import Link from "next/link";
import type { Metadata } from "next";
import { COUNTRIES } from "@/lib/countries";

export const metadata: Metadata = {
  title: "مواضيع دكتوراه أجنبية — حول العالم",
  description:
    "تصفّح مواضيع امتحانات القبول في دكتوراه الرياضيات حسب الدولة والجامعة والتخصص والسنة.",
};

export default function WorldPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="text-base font-bold">🌍 مواضيع دكتوراه أجنبية</h1>
        <p className="text-[11px] text-muted-foreground">
          اختر الدولة ثم تصفّح المواضيع
        </p>
      </header>

      <div className="mt-4 h-px bg-gradient-to-l from-primary/40 via-border to-transparent" />

      <div className="mt-2 divide-y">
        {COUNTRIES.map((country) => (
          <Link
            key={country.slug}
            href={`/world/${country.slug}`}
            className="group flex min-h-14 items-center gap-3 py-2.5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={country.flag}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-border"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium transition group-hover:text-primary">
                {country.nameAr}
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                {country.nameNative}
                {country.nameNative !== country.nameEn ? ` · ${country.nameEn}` : ""}
              </span>
            </span>
            <span className="shrink-0 text-xs text-muted-foreground transition group-hover:-translate-x-0.5 group-hover:text-primary">
              ←
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
