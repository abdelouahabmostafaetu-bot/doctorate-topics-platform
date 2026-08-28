export type Country = {
  code: string;
  iso: string;
  slug: string;
  nameAr: string;
  nameNative: string;
  nameEn: string;
  flag: string;
};

export const COUNTRIES: Country[] = [
  {
    code: "tw",
    iso: "TW",
    slug: "taiwan",
    nameAr: "تايوان",
    nameNative: "臺灣",
    nameEn: "Taiwan",
    flag: "https://flagcdn.com/w80/tw.png",
  },
  {
    code: "sg",
    iso: "SG",
    slug: "singapore",
    nameAr: "سنغافورة",
    nameNative: "新加坡",
    nameEn: "Singapore",
    flag: "https://flagcdn.com/w80/sg.png",
  },
];

export function getCountryBySlug(slug: string): Country | undefined {
  const value = slug.trim().toLowerCase();
  return COUNTRIES.find(
    (country) => country.slug === value || country.code === value,
  );
}

export function isInternationalSlug(slug: string): boolean {
  return COUNTRIES.some((country) => slug.startsWith(`${country.code}-`));
}
