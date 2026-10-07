// بيانات عرض الدول الأجنبية — المصدر الوحيد لأسماء الدول وأعلامها.
//
// إضافة دولة جديدة تتطلب سطرًا واحدًا هنا فقط: المفتاح هو رمز ISO-2
// بالأحرف الكبيرة، ويجب أن يطابق بادئة اسم الجامعة في قاعدة البيانات
// ("XX - اسم الجامعة"). إن ظهر رمز في قاعدة البيانات دون سطر هنا،
// يُعرض الرمز كما هو (انظر fallbackCountry في lib/countries.ts).
export type CountryMeta = {
  slug: string;
  nameAr: string;
  nameNative: string;
  nameEn: string;
  flag: string;
};

export const COUNTRY_META: Record<string, CountryMeta> = {
  BR: {
    slug: "brazil",
    nameAr: "البرازيل",
    nameNative: "Brasil",
    nameEn: "Brazil",
    flag: "https://flagcdn.com/w80/br.png",
  },
  CA: {
    slug: "canada",
    nameAr: "كندا",
    nameNative: "Canada",
    nameEn: "Canada",
    flag: "https://flagcdn.com/w80/ca.png",
  },
  MX: {
    slug: "mexico",
    nameAr: "المكسيك",
    nameNative: "México",
    nameEn: "Mexico",
    flag: "https://flagcdn.com/w80/mx.png",
  },
  TW: {
    slug: "taiwan",
    nameAr: "تايوان",
    nameNative: "臺灣",
    nameEn: "Taiwan",
    flag: "https://flagcdn.com/w80/tw.png",
  },
  CO: {
    slug: "colombia",
    nameAr: "كولومبيا",
    nameNative: "Colombia",
    nameEn: "Colombia",
    flag: "https://flagcdn.com/w80/co.png",
  },
  IT: {
    slug: "italy",
    nameAr: "إيطاليا",
    nameNative: "Italia",
    nameEn: "Italy",
    flag: "https://flagcdn.com/w80/it.png",
  },
  TR: {
    slug: "turkey",
    nameAr: "تركيا",
    nameNative: "Türkiye",
    nameEn: "Turkey",
    flag: "https://flagcdn.com/w80/tr.png",
  },
  JP: {
    slug: "japan",
    nameAr: "اليابان",
    nameNative: "日本",
    nameEn: "Japan",
    flag: "https://flagcdn.com/w80/jp.png",
  },
  SA: {
    slug: "saudi-arabia",
    nameAr: "السعودية",
    nameNative: "المملكة العربية السعودية",
    nameEn: "Saudi Arabia",
    flag: "https://flagcdn.com/w80/sa.png",
  },
  KR: {
    slug: "south-korea",
    nameAr: "كوريا الجنوبية",
    nameNative: "대한민국",
    nameEn: "South Korea",
    flag: "https://flagcdn.com/w80/kr.png",
  },
  IN: {
    slug: "india",
    nameAr: "الهند",
    nameNative: "भारत",
    nameEn: "India",
    flag: "https://flagcdn.com/w80/in.png",
  },
  SG: {
    slug: "singapore",
    nameAr: "سنغافورة",
    nameNative: "新加坡",
    nameEn: "Singapore",
    flag: "https://flagcdn.com/w80/sg.png",
  },
  US: {
    slug: "united-states",
    nameAr: "الولايات المتحدة",
    nameNative: "United States",
    nameEn: "United States",
    flag: "https://flagcdn.com/w80/us.png",
  },
  DE: {
    slug: "germany",
    nameAr: "ألمانيا",
    nameNative: "Deutschland",
    nameEn: "Germany",
    flag: "https://flagcdn.com/w80/de.png",
  },
};
