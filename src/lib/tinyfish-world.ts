export type TinyFishCampaign = {
  key: string;
  countryCode: string;
  countryAr: string;
  university: string;
  universityAr: string;
  domain: string;
  query: string;
};

export const TINYFISH_WORLD_CAMPAIGNS: TinyFishCampaign[] = [
  {
    key: "ca-waterloo",
    countryCode: "CA",
    countryAr: "كندا",
    university: "University of Waterloo",
    universityAr: "جامعة واترلو",
    domain: "uwaterloo.ca",
    query: "mathematics PhD qualifying examination past exam",
  },
  {
    key: "ca-toronto",
    countryCode: "CA",
    countryAr: "كندا",
    university: "University of Toronto",
    universityAr: "جامعة تورنتو",
    domain: "utoronto.ca",
    query: "mathematics graduate comprehensive qualifying exam",
  },
  {
    key: "ca-ubc",
    countryCode: "CA",
    countryAr: "كندا",
    university: "University of British Columbia",
    universityAr: "جامعة كولومبيا البريطانية",
    domain: "ubc.ca",
    query: "mathematics graduate qualifying examination",
  },
  {
    key: "ca-mcgill",
    countryCode: "CA",
    countryAr: "كندا",
    university: "McGill University",
    universityAr: "جامعة ماكغيل",
    domain: "mcgill.ca",
    query: "mathematics PhD comprehensive examination",
  },
  {
    key: "us-harvard",
    countryCode: "US",
    countryAr: "الولايات المتحدة",
    university: "Harvard University",
    universityAr: "جامعة هارفارد",
    domain: "harvard.edu",
    query: "mathematics qualifying examination past exam",
  },
  {
    key: "us-mit",
    countryCode: "US",
    countryAr: "الولايات المتحدة",
    university: "Massachusetts Institute of Technology",
    universityAr: "معهد ماساتشوستس للتكنولوجيا",
    domain: "mit.edu",
    query: "mathematics graduate qualifying examination",
  },
  {
    key: "us-princeton",
    countryCode: "US",
    countryAr: "الولايات المتحدة",
    university: "Princeton University",
    universityAr: "جامعة برينستون",
    domain: "princeton.edu",
    query: "mathematics general examination past exam",
  },
  {
    key: "us-berkeley",
    countryCode: "US",
    countryAr: "الولايات المتحدة",
    university: "University of California Berkeley",
    universityAr: "جامعة كاليفورنيا بيركلي",
    domain: "berkeley.edu",
    query: "mathematics preliminary examination past exam",
  },
  {
    key: "us-stanford",
    countryCode: "US",
    countryAr: "الولايات المتحدة",
    university: "Stanford University",
    universityAr: "جامعة ستانفورد",
    domain: "stanford.edu",
    query: "mathematics PhD qualifying examination",
  },
  {
    key: "de-bonn",
    countryCode: "DE",
    countryAr: "ألمانيا",
    university: "University of Bonn",
    universityAr: "جامعة بون",
    domain: "uni-bonn.de",
    query: "mathematics doctoral qualifying examination exam",
  },
  {
    key: "de-tu-berlin",
    countryCode: "DE",
    countryAr: "ألمانيا",
    university: "Technical University of Berlin",
    universityAr: "الجامعة التقنية في برلين",
    domain: "tu-berlin.de",
    query: "mathematics doctoral examination exam",
  },
  {
    key: "de-lmu",
    countryCode: "DE",
    countryAr: "ألمانيا",
    university: "LMU Munich",
    universityAr: "جامعة لودفيغ ماكسيميليان في ميونخ",
    domain: "lmu.de",
    query: "mathematics doctoral examination past exam",
  },
  {
    key: "sg-nus",
    countryCode: "SG",
    countryAr: "سنغافورة",
    university: "National University of Singapore",
    universityAr: "جامعة سنغافورة الوطنية",
    domain: "nus.edu.sg",
    query: "mathematics PhD qualifying examination",
  },
  {
    key: "tw-ntu",
    countryCode: "TW",
    countryAr: "تايوان",
    university: "National Taiwan University",
    universityAr: "جامعة تايوان الوطنية",
    domain: "ntu.edu.tw",
    query: "mathematics doctoral entrance examination",
  },
];

export function getTinyFishCampaign(key: string) {
  return TINYFISH_WORLD_CAMPAIGNS.find((campaign) => campaign.key === key) || null;
}