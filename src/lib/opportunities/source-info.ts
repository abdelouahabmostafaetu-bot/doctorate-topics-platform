/** Public metadata of the automatic opportunity sources (safe for client/server components). */
export const AUTO_ORIGINS = [
  "mathjobs", "ems", "euraxess", "inspire", "jobsacuk", "academictransfer", "varbi",
  "unijobs", "sciencecareers", "chronicle", "physicstoday", "amstat",
  "scholars4dev", "ofa", "scholarshipregion", "greatyop", "scholarshipscorner", "scholarshiproar",
] as const;
export type AutoOrigin = (typeof AUTO_ORIGINS)[number];

export const SOURCE_INFO: Record<AutoOrigin, { name: string; homepage: string; ar: string; en: string }> = {
  mathjobs: { name: "MathJobs.org (AMS)", homepage: "https://www.mathjobs.org/jobs", ar: "منصة الجمعية الأمريكية للرياضيات لمناصب ومنح الرياضيات", en: "American Mathematical Society job board" },
  ems: { name: "European Mathematical Society — Jobs", homepage: "https://euromathsoc.org/jobs", ar: "إعلانات الجمعية الأوروبية للرياضيات", en: "European Mathematical Society job announcements" },
  euraxess: { name: "EURAXESS (European Commission)", homepage: "https://euraxess.ec.europa.eu/jobs/search", ar: "بوابة المفوضية الأوروبية لوظائف الباحثين", en: "European Commission researcher job portal" },
  inspire: { name: "INSPIRE-HEP Jobs", homepage: "https://inspirehep.net/jobs", ar: "مناصب دكتوراه في الفيزياء الرياضية", en: "PhD positions in mathematical physics" },
  unijobs: { name: "THE Unijobs", homepage: "https://www.timeshighereducation.com/unijobs/", ar: "وظائف Times Higher Education الجامعية", en: "Times Higher Education university jobs" },
  sciencecareers: { name: "Science Careers (AAAS)", homepage: "https://jobs.sciencecareers.org/", ar: "موقع وظائف مجلة Science", en: "Science magazine job board" },
  jobsacuk: { name: "jobs.ac.uk — PhD studentships", homepage: "https://www.jobs.ac.uk/search/?keywords=mathematics&jobTypeFacet%5B0%5D=phds", ar: "منح الدكتوراه (studentships) في الجامعات البريطانية", en: "UK PhD studentships" },
  academictransfer: { name: "AcademicTransfer", homepage: "https://www.academictransfer.com/en/jobs/?q=phd+mathematics", ar: "مناصب دكتوراه براتب في الجامعات الهولندية", en: "Salaried PhD positions at Dutch universities" },
  varbi: { name: "Varbi — Swedish universities", homepage: "https://kth.varbi.com/en/", ar: "مناصب دكتوراه براتب في جامعات سويدية (KTH، أوبسالا، ستوكهولم، لوند…)", en: "Salaried PhD positions at Swedish universities (KTH, Uppsala, Stockholm, Lund…)" },
  chronicle: { name: "Chronicle Jobs", homepage: "https://jobs.chronicle.com/", ar: "وظائف The Chronicle of Higher Education", en: "The Chronicle of Higher Education job board" },
  physicstoday: { name: "Physics Today Jobs (AIP)", homepage: "https://jobs.physicstoday.org/", ar: "وظائف المعهد الأمريكي للفيزياء (فيزياء رياضية)", en: "American Institute of Physics job board (mathematical physics)" },
  amstat: { name: "ASA JobWeb (statistics)", homepage: "https://jobs.amstat.org/", ar: "وظائف ومنح الجمعية الأمريكية للإحصاء", en: "American Statistical Association job board" },
  scholars4dev: { name: "Scholars4Dev", homepage: "https://www.scholars4dev.com/", ar: "منح دولية لطلبة الدول النامية (ماستر ودكتوراه)", en: "International scholarships for developing-country students" },
  scholarshipregion: { name: "Scholarship Region", homepage: "https://www.scholarshipregion.com/", ar: "أخبار منح الماستر والدكتوراه الدولية", en: "International master's/PhD scholarship news" },
  greatyop: { name: "GreatYop", homepage: "https://greatyop.com/", ar: "منح دولية للطلبة الأجانب", en: "International scholarships for foreign students" },
  scholarshipscorner: { name: "Scholarships Corner", homepage: "https://scholarshipscorner.website/", ar: "منح ممولة بالكامل للطلبة الدوليين", en: "Fully funded scholarships for international students" },
  scholarshiproar: { name: "Scholarship Roar", homepage: "https://scholarshiproar.com/", ar: "منح الجامعات للطلبة الدوليين", en: "University scholarships for international students" },
  ofa: { name: "Opportunities For Africans", homepage: "https://www.opportunitiesforafricans.com/category/scholarships/", ar: "منح دراسات عليا مفتوحة للطلبة الأفارقة", en: "Graduate scholarships open to African students" },
};

export const isAutoOrigin = (o?: string): o is AutoOrigin => !!o && (AUTO_ORIGINS as readonly string[]).includes(o);
