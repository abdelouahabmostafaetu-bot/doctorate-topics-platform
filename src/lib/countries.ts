import { COUNTRY_META } from "@/lib/country-meta";

export type Country = {
  code: string;
  iso: string;
  slug: string;
  nameAr: string;
  nameNative: string;
  nameEn: string;
  flag: string;
};

// القائمة مشتقّة من COUNTRY_META — الترتيب هنا هو ترتيب تعريفها هناك
export const COUNTRIES: Country[] = Object.entries(COUNTRY_META).map(
  ([iso, meta]) => ({
    code: iso.toLowerCase(),
    iso,
    ...meta,
  }),
);

/**
 * دولة احتياطية لرمز ISO-2 موجود في قاعدة البيانات لكنه لم يُضف بعد إلى
 * COUNTRY_META — نعرض الرمز كما هو بدل أن تتعطّل الصفحة.
 */
export function fallbackCountry(iso: string): Country {
  const code = iso.toLowerCase();
  return {
    code,
    iso,
    slug: code,
    nameAr: iso,
    nameNative: iso,
    nameEn: iso,
    flag: `https://flagcdn.com/w80/${code}.png`,
  };
}

export function getCountryBySlug(slug: string): Country | undefined {
  const value = slug.trim().toLowerCase();
  const known = COUNTRIES.find(
    (country) => country.slug === value || country.code === value,
  );
  if (known) return known;
  // رمز من حرفين غير معروف: دولة احتياطية (تتحقق الصفحة من وجودها في قاعدة البيانات)
  if (/^[a-z]{2}$/.test(value)) return fallbackCountry(value.toUpperCase());
  return undefined;
}

export function isInternationalSlug(slug: string): boolean {
  return COUNTRIES.some((country) => slug.startsWith(`${country.code}-`));
}
