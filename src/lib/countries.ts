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
    code: "in",
    iso: "IN",
    slug: "india",
    nameAr: "الهند",
    nameNative: "भारत",
    nameEn: "India",
    flag: "https://flagcdn.com/w80/in.png",
  },
  {
    code: "pk",
    iso: "PK",
    slug: "pakistan",
    nameAr: "باكستان",
    nameNative: "پاکستان",
    nameEn: "Pakistan",
    flag: "https://flagcdn.com/w80/pk.png",
  },
  {
    code: "jp",
    iso: "JP",
    slug: "japan",
    nameAr: "اليابان",
    nameNative: "日本",
    nameEn: "Japan",
    flag: "https://flagcdn.com/w80/jp.png",
  },
  {
    code: "sa",
    iso: "SA",
    slug: "saudi-arabia",
    nameAr: "السعودية",
    nameNative: "المملكة العربية السعودية",
    nameEn: "Saudi Arabia",
    flag: "https://flagcdn.com/w80/sa.png",
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
