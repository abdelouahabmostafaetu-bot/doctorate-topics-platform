/** Public metadata of the automatic opportunity sources (safe for client/server components). */
export const AUTO_ORIGINS = ["mathjobs", "ems", "euraxess", "inspire", "unijobs", "sciencecareers", "scholars4dev", "ofa"] as const;
export type AutoOrigin = (typeof AUTO_ORIGINS)[number];

export const SOURCE_INFO: Record<AutoOrigin, { name: string; homepage: string; ar: string; en: string }> = {
  mathjobs: { name: "MathJobs.org (AMS)", homepage: "https://www.mathjobs.org/jobs", ar: "منصة الجمعية الأمريكية للرياضيات لمناصب ومنح الرياضيات", en: "American Mathematical Society job board" },
  ems: { name: "European Mathematical Society — Jobs", homepage: "https://euromathsoc.org/jobs", ar: "إعلانات الجمعية الأوروبية للرياضيات", en: "European Mathematical Society job announcements" },
  euraxess: { name: "EURAXESS (European Commission)", homepage: "https://euraxess.ec.europa.eu/jobs/search", ar: "بوابة المفوضية الأوروبية لوظائف الباحثين", en: "European Commission researcher job portal" },
  inspire: { name: "INSPIRE-HEP Jobs", homepage: "https://inspirehep.net/jobs", ar: "مناصب دكتوراه في الفيزياء الرياضية", en: "PhD positions in mathematical physics" },
  unijobs: { name: "THE Unijobs", homepage: "https://www.timeshighereducation.com/unijobs/", ar: "وظائف Times Higher Education الجامعية", en: "Times Higher Education university jobs" },
  sciencecareers: { name: "Science Careers (AAAS)", homepage: "https://jobs.sciencecareers.org/", ar: "موقع وظائف مجلة Science", en: "Science magazine job board" },
  scholars4dev: { name: "Scholars4Dev", homepage: "https://www.scholars4dev.com/", ar: "منح دولية لطلبة الدول النامية (ماستر ودكتوراه)", en: "International scholarships for developing-country students" },
  ofa: { name: "Opportunities For Africans", homepage: "https://www.opportunitiesforafricans.com/category/scholarships/", ar: "منح دراسات عليا مفتوحة للطلبة الأفارقة", en: "Graduate scholarships open to African students" },
};

export const isAutoOrigin = (o?: string): o is AutoOrigin => !!o && (AUTO_ORIGINS as readonly string[]).includes(o);
