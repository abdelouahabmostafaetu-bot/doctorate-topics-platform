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
  TW: {
    slug: "taiwan",
    nameAr: "تايوان",
    nameNative: "臺灣",
    nameEn: "Taiwan",
    flag: "https://flagcdn.com/w80/tw.png",
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
};
