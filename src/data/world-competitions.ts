export type CompetitionLevel = "secondary" | "university" | "postgraduate" | "open"
export type CompetitionScope = "international" | "regional" | "national"
export type CompetitionFormat = "olympiad" | "university" | "modeling" | "selection" | "training"
export type CompetitionParticipation = "individual" | "team" | "mixed"

export type CompetitionEdition = {
  year: number
  title: string
  problemsCount?: number
  durationMinutes?: number
  languages: string[]
  subjects: string[]
  officialPdfUrl?: string
  officialSolutionPdfUrl?: string
  officialProblemsUrl?: string
  resultsUrl?: string
  problemsMarkdown?: string
  solutionsMarkdown?: string
  published: boolean
}

export type WorldCompetition = {
  slug: string
  shortName: string
  name: string
  nameAr: string
  descriptionAr: string
  level: CompetitionLevel
  scope: CompetitionScope
  format: CompetitionFormat
  participation: CompetitionParticipation
  region: string
  country?: string
  officialUrl: string
  languages: string[]
  subjects: string[]
  editions: CompetitionEdition[]
}

export const LEVEL_LABELS: Record<CompetitionLevel, string> = {
  secondary: "ثانوي",
  university: "جامعي",
  postgraduate: "دراسات عليا",
  open: "مفتوح",
}

export const SCOPE_LABELS: Record<CompetitionScope, string> = {
  international: "دولية",
  regional: "إقليمية",
  national: "وطنية",
}

export const FORMAT_LABELS: Record<CompetitionFormat, string> = {
  olympiad: "أولمبياد",
  university: "مسابقة جامعية",
  modeling: "نمذجة رياضية",
  selection: "اختيار فريق",
  training: "تدريبية",
}

export const PARTICIPATION_LABELS: Record<CompetitionParticipation, string> = {
  individual: "فردية",
  team: "جماعية",
  mixed: "فردية وجماعية",
}

export const REGION_LABELS: Record<string, string> = {
  global: "العالم",
  africa: "إفريقيا",
  asia: "آسيا",
  europe: "أوروبا",
  americas: "الأمريكيتان",
  "asia-pacific": "آسيا والمحيط الهادئ",
  mena: "العالم العربي وشمال إفريقيا",
}

export const LANGUAGE_LABELS: Record<string, string> = {
  ar: "العربية",
  en: "الإنجليزية",
  fr: "الفرنسية",
  es: "الإسبانية",
  de: "الألمانية",
  zh: "الصينية",
  ru: "الروسية",
  multi: "متعددة اللغات",
}

export const SUBJECT_LABELS: Record<string, string> = {
  algebra: "الجبر",
  analysis: "التحليل",
  geometry: "الهندسة",
  "number-theory": "نظرية الأعداد",
  combinatorics: "التوافقيات",
  probability: "الاحتمالات",
  "differential-equations": "المعادلات التفاضلية",
  "numerical-analysis": "التحليل العددي",
  modeling: "النمذجة الرياضية",
  applied: "رياضيات تطبيقية",
  mixed: "مواضيع مختلطة",
}

const years = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, index) => from + index).reverse()

const olympiadSubjects = ["algebra", "geometry", "number-theory", "combinatorics"]
const universitySubjects = ["algebra", "analysis", "geometry", "combinatorics"]

const apmoEditions: CompetitionEdition[] = years(1989, 2026).map((year) => ({
  year,
  title: `APMO ${year} — Official Problems`,
  problemsCount: 5,
  durationMinutes: 240,
  languages: ["en"],
  subjects: olympiadSubjects,
  officialPdfUrl: `https://www.apmo-official.org/static/problems/apmo${year}_prb.pdf`,
  officialSolutionPdfUrl: `https://www.apmo-official.org/static/solutions/apmo${year}_sol.pdf`,
  resultsUrl: "https://www.apmo-official.org/results",
  published: true,
}))

const imoEditions: CompetitionEdition[] = years(1959, 2026)
  .filter((year) => year !== 1980)
  .map((year) => ({
    year,
    title: `IMO ${year} — Official Problems`,
    problemsCount: 6,
    durationMinutes: 540,
    languages: ["multi"],
    subjects: olympiadSubjects,
    officialPdfUrl: `https://www.imo-official.org/assets/documents/problems/${year}/${year}_eng.pdf`,
    officialProblemsUrl: `https://www.imo-official.org/problems/`,
    resultsUrl: `https://www.imo-official.org/year_info.aspx?year=${year}`,
    published: true,
  }))

const imcEditions: CompetitionEdition[] = years(1994, 2026).map((year) => ({
  year,
  title: `IMC ${year} — Problems and Results`,
  languages: ["en"],
  subjects: universitySubjects,
  officialProblemsUrl: `https://www.imc-math.org.uk/?item=problems&year=${year}`,
  resultsUrl: `https://www.imc-math.org.uk/?item=results&year=${year}`,
  published: true,
}))

const mcmEditions: CompetitionEdition[] = years(1999, 2026).map((year) => ({
  year,
  title: `MCM/ICM ${year} — Official Problem Set`,
  languages: ["en"],
  subjects: ["modeling", "applied"],
  officialProblemsUrl: `https://www.contest.comap.com/undergraduate/contests/mcm/contests/${year}/problems/`,
  resultsUrl: `https://www.contest.comap.com/undergraduate/contests/mcm/contests/${year}/results/`,
  published: true,
}))

const egmoHomepages: Record<number, string> = {
  2026: "https://egmo2026.fr/",
  2025: "https://egmo2025.com/",
  2024: "https://egmo2024.ge/",
  2023: "https://egmo2023.dmfa.si/",
  2022: "https://egmo2022.hu/",
  2021: "https://egmo2021.atsu.edu.ge/",
  2020: "https://egmo2020.nl/",
}

const egmoEditions: CompetitionEdition[] = years(2012, 2026).map((year) => ({
  year,
  title: `EGMO ${year} — Official Edition`,
  problemsCount: 6,
  durationMinutes: 540,
  languages: ["multi"],
  subjects: olympiadSubjects,
  officialProblemsUrl: egmoHomepages[year] ?? "https://www.egmo.org/",
  resultsUrl: "https://www.egmo.org/",
  published: true,
}))

const putnamEditions: CompetitionEdition[] = [
  {
    year: 2025,
    title: "Putnam 2025 — Sessions A and B",
    problemsCount: 12,
    durationMinutes: 360,
    languages: ["en"],
    subjects: universitySubjects,
    officialPdfUrl: "https://maa.org/wp-content/uploads/2026/02/2025-Putnam-Problems-for-Sessions-A-and-B.pdf",
    officialSolutionPdfUrl: "https://maa.org/wp-content/uploads/2026/02/2025OfficialSolutions.pdf",
    resultsUrl: "https://maa.org/wp-content/uploads/2026/03/2025-Putnam-Competition-Announcement-of-Winners.pdf",
    published: true,
  },
  {
    year: 2024,
    title: "Putnam 2024 — Sessions A and B",
    problemsCount: 12,
    durationMinutes: 360,
    languages: ["en"],
    subjects: universitySubjects,
    officialPdfUrl: "https://maa.org/wp-content/uploads/2026/02/2024-Putnam-Problems.pdf",
    officialSolutionPdfUrl: "https://maa.org/wp-content/uploads/2026/02/2024-Putnam-Solutions.pdf",
    resultsUrl: "https://maa.org/wp-content/uploads/2025/03/2024-William-Lowell-Putnam-Competition-Announcement-of-Winners.pdf",
    published: true,
  },
  {
    year: 2023,
    title: "Putnam 2023 — Sessions A and B",
    problemsCount: 12,
    durationMinutes: 360,
    languages: ["en"],
    subjects: universitySubjects,
    officialPdfUrl: "https://maa.org/wp-content/uploads/2025/02/2023-Putnam-Problems.pdf",
    officialSolutionPdfUrl: "https://maa.org/wp-content/uploads/2025/02/2023-Putnam-Problems-and-Solutions.pdf",
    resultsUrl: "https://maa.org/wp-content/uploads/2025/02/2023-Putnam-Announcement-of-Winners-1.pdf",
    published: true,
  },
]

const externalEditions = (
  from: number,
  to: number,
  title: (year: number) => string,
  officialProblemsUrl: string,
  subjects: string[] = olympiadSubjects,
  languages: string[] = ["en"],
): CompetitionEdition[] => years(from, to).map((year) => ({
  year,
  title: title(year),
  languages,
  subjects,
  officialProblemsUrl,
  published: true,
}))

export const WORLD_COMPETITIONS: WorldCompetition[] = [
  {
    slug: "imo",
    shortName: "IMO",
    name: "International Mathematical Olympiad",
    nameAr: "الأولمبياد الدولي للرياضيات",
    descriptionAr: "أشهر أولمبياد عالمي لطلبة المرحلة الثانوية، بست مسائل برهانية موزعة على يومين.",
    level: "secondary",
    scope: "international",
    format: "olympiad",
    participation: "individual",
    region: "global",
    officialUrl: "https://www.imo-official.org/",
    languages: ["multi"],
    subjects: olympiadSubjects,
    editions: imoEditions,
  },
  {
    slug: "apmo",
    shortName: "APMO",
    name: "Asian Pacific Mathematical Olympiad",
    nameAr: "أولمبياد آسيا والمحيط الهادئ للرياضيات",
    descriptionAr: "مسابقة إقليمية دولية للمرحلة الثانوية، تتكوّن عادةً من خمس مسائل برهانية.",
    level: "secondary",
    scope: "regional",
    format: "olympiad",
    participation: "individual",
    region: "asia-pacific",
    officialUrl: "https://www.apmo-official.org/",
    languages: ["en"],
    subjects: olympiadSubjects,
    editions: apmoEditions,
  },
  {
    slug: "egmo",
    shortName: "EGMO",
    name: "European Girls' Mathematical Olympiad",
    nameAr: "الأولمبياد الأوروبي للرياضيات للفتيات",
    descriptionAr: "أولمبياد دولي للفتيات في المرحلة الثانوية، بست مسائل على يومين وبمشاركة دول من أنحاء العالم.",
    level: "secondary",
    scope: "international",
    format: "olympiad",
    participation: "individual",
    region: "europe",
    officialUrl: "https://www.egmo.org/",
    languages: ["multi"],
    subjects: olympiadSubjects,
    editions: egmoEditions,
  },
  {
    slug: "imc-university",
    shortName: "IMC",
    name: "International Mathematics Competition for University Students",
    nameAr: "المسابقة الدولية للرياضيات لطلبة الجامعات",
    descriptionAr: "مسابقة دولية فردية لطلبة الجامعات في الجبر والتحليل والهندسة والتوافقيات.",
    level: "university",
    scope: "international",
    format: "university",
    participation: "individual",
    region: "global",
    officialUrl: "https://www.imc-math.org.uk/",
    languages: ["en"],
    subjects: universitySubjects,
    editions: imcEditions,
  },
  {
    slug: "putnam",
    shortName: "Putnam",
    name: "William Lowell Putnam Mathematical Competition",
    nameAr: "مسابقة ويليام لويل بوتنام للرياضيات",
    descriptionAr: "مسابقة جامعية فردية عريقة في الولايات المتحدة وكندا، تتكوّن من اثنتي عشرة مسألة شديدة التحدي.",
    level: "university",
    scope: "regional",
    format: "university",
    participation: "individual",
    region: "americas",
    officialUrl: "https://maa.org/maa-putnam-archive",
    languages: ["en"],
    subjects: universitySubjects,
    editions: putnamEditions,
  },
  {
    slug: "mcm-icm",
    shortName: "MCM/ICM",
    name: "Mathematical and Interdisciplinary Contest in Modeling",
    nameAr: "مسابقة النمذجة الرياضية ومتعددة التخصصات",
    descriptionAr: "مسابقة جامعية عالمية تعمل فيها فرق صغيرة على نمذجة مشكلة تطبيقية وكتابة تقرير علمي.",
    level: "university",
    scope: "international",
    format: "modeling",
    participation: "team",
    region: "global",
    officialUrl: "https://www.comap.org/contests/mcm-icm",
    languages: ["en"],
    subjects: ["modeling", "applied"],
    editions: mcmEditions,
  },
  {
    slug: "pamo",
    shortName: "PAMO",
    name: "Pan African Mathematics Olympiad",
    nameAr: "الأولمبياد الإفريقي للرياضيات",
    descriptionAr: "أولمبياد قاري إفريقي لطلبة المرحلة الثانوية، يضم ورقتين برهانيتين مدة كل منهما أربع ساعات ونصف.",
    level: "secondary",
    scope: "regional",
    format: "olympiad",
    participation: "individual",
    region: "africa",
    officialUrl: "https://www.pamoofficial.org/",
    languages: ["en", "fr"],
    subjects: olympiadSubjects,
    editions: externalEditions(2000, 2025, (year) => `PAMO ${year} — Official Archive`, "https://www.pamoofficial.org/", olympiadSubjects, ["en", "fr"]),
  },
  {
    slug: "baltic-way",
    shortName: "Baltic Way",
    name: "Baltic Way Mathematical Team Contest",
    nameAr: "مسابقة طريق البلطيق الجماعية للرياضيات",
    descriptionAr: "مسابقة أولمبياد جماعية بين دول منطقة البلطيق وشمال أوروبا، تشتهر بمسائلها البرهانية المتنوعة.",
    level: "secondary",
    scope: "regional",
    format: "olympiad",
    participation: "team",
    region: "europe",
    officialUrl: "https://www.math.olympiaadid.ut.ee/eng/html/?id=bw",
    languages: ["en"],
    subjects: olympiadSubjects,
    editions: externalEditions(1990, 2025, (year) => `Baltic Way ${year} — Problems and Solutions`, "https://www.math.olympiaadid.ut.ee/eng/html/?id=bw"),
  },
  {
    slug: "memo",
    shortName: "MEMO",
    name: "Middle European Mathematical Olympiad",
    nameAr: "أولمبياد أوروبا الوسطى للرياضيات",
    descriptionAr: "أولمبياد إقليمي يضم مسابقتين فردية وجماعية لطلبة المرحلة الثانوية في دول أوروبا الوسطى.",
    level: "secondary",
    scope: "regional",
    format: "olympiad",
    participation: "mixed",
    region: "europe",
    officialUrl: "https://www.memo-official.org/",
    languages: ["en"],
    subjects: olympiadSubjects,
    editions: externalEditions(2007, 2025, (year) => `MEMO ${year} — Previous Contest`, "https://www.memo-official.org/MEMO/contests/previous"),
  },
  {
    slug: "rmm",
    shortName: "RMM",
    name: "Romanian Master of Mathematics",
    nameAr: "الماستر الروماني للرياضيات",
    descriptionAr: "مسابقة دولية رفيعة المستوى لفرق الأولمبياد الوطنية وطلبة المرحلة الثانوية المتميزين.",
    level: "secondary",
    scope: "international",
    format: "olympiad",
    participation: "individual",
    region: "europe",
    officialUrl: "https://rmms.lbi.ro/",
    languages: ["en"],
    subjects: olympiadSubjects,
    editions: years(2024, 2026).map((year) => ({ year, title: `RMM ${year} — Official Problems`, languages: ["en"], subjects: olympiadSubjects, officialProblemsUrl: `https://rmms.lbi.ro/rmm${year}/index.php?id=problems_math`, published: true })),
  },
  {
    slug: "cmo",
    shortName: "CMO",
    name: "Canadian Mathematical Olympiad",
    nameAr: "الأولمبياد الكندي للرياضيات",
    descriptionAr: "المسابقة الوطنية الكندية العليا في حل المسائل البرهانية لطلبة المرحلة الثانوية.",
    level: "secondary",
    scope: "national",
    format: "selection",
    participation: "individual",
    region: "americas",
    country: "Canada",
    officialUrl: "https://cms.math.ca/competitions/cmo/",
    languages: ["en", "fr"],
    subjects: olympiadSubjects,
    editions: externalEditions(1969, 2025, (year) => `CMO ${year} — Problems and Solutions`, "https://cms.math.ca/problem-solving-res/competition-exams-from-previous-years/", olympiadSubjects, ["en", "fr"]),
  },
  {
    slug: "bmo",
    shortName: "BMO",
    name: "British Mathematical Olympiad",
    nameAr: "الأولمبياد البريطاني للرياضيات",
    descriptionAr: "أولمبياد وطني بريطاني ومسار لاختيار وتدريب الفريق الدولي، بمسائل تتطلب حلولًا برهانية كاملة.",
    level: "secondary",
    scope: "national",
    format: "selection",
    participation: "individual",
    region: "europe",
    country: "United Kingdom",
    officialUrl: "https://bmos.ukmt.org.uk/home/bmo.shtml",
    languages: ["en"],
    subjects: olympiadSubjects,
    editions: externalEditions(1965, 2025, (year) => `BMO ${year} — Past Paper`, "https://bmos.ukmt.org.uk/home/bmo.shtml"),
  },
  {
    slug: "seemous",
    shortName: "SEEMOUS",
    name: "South Eastern European Mathematical Olympiad for University Students",
    nameAr: "أولمبياد جنوب شرق أوروبا للرياضيات لطلبة الجامعات",
    descriptionAr: "مسابقة جامعية إقليمية في الجبر والتحليل والهندسة والتوافقيات.",
    level: "university",
    scope: "regional",
    format: "university",
    participation: "individual",
    region: "europe",
    officialUrl: "https://www.seemous2020.auth.gr/",
    languages: ["en"],
    subjects: universitySubjects,
    editions: [
      { year: 2026, title: "SEEMOUS 2026 — Official Edition", languages: ["en"], subjects: universitySubjects, officialProblemsUrl: "https://www.cms.org.cy/pages/competitions/seemous-2026-3-8-march-2026-paphos-cyprus/seemous-20261759418399", published: true },
      { year: 2020, title: "SEEMOUS 2020 — Official Problems", languages: ["en"], subjects: universitySubjects, officialPdfUrl: "https://seemous2020.auth.gr/sites/default/files/2020-03/SEEMOUS2020Problems.pdf", officialSolutionPdfUrl: "https://seemous2020.auth.gr/sites/default/files/2020-03/SEEMOUS2020Solutions.pdf", published: true },
    ],
  },
  {
    slug: "vjimc",
    shortName: "VJIMC",
    name: "Vojtěch Jarník International Mathematical Competition",
    nameAr: "مسابقة فويتخ يارنيك الدولية للرياضيات",
    descriptionAr: "مسابقة دولية لطلبة الجامعات تنظّمها جامعة أوسترافا، بفئتين حسب المرحلة الجامعية.",
    level: "university",
    scope: "international",
    format: "university",
    participation: "individual",
    region: "europe",
    officialUrl: "https://vjimc.osu.cz/",
    languages: ["en"],
    subjects: universitySubjects,
    editions: [
      { year: 2025, title: "VJIMC 2025 — Category I", languages: ["en"], subjects: universitySubjects, officialPdfUrl: "https://vjimc.osu.cz/storage/uploads/j32problems1.pdf", officialSolutionPdfUrl: "https://vjimc.osu.cz/storage/uploads/j32solutions1.pdf", resultsUrl: "https://vjimc.osu.cz/problems", published: true },
    ],
  },
  {
    slug: "balkan-mo",
    shortName: "BMO Balkan",
    name: "Balkan Mathematical Olympiad",
    nameAr: "أولمبياد البلقان للرياضيات",
    descriptionAr: "أولمبياد إقليمي لطلبة المرحلة الثانوية من دول البلقان والدول الضيفة.",
    level: "secondary",
    scope: "regional",
    format: "olympiad",
    participation: "individual",
    region: "europe",
    officialUrl: "https://bmo2025.pmf.unsa.ba/",
    languages: ["en"],
    subjects: olympiadSubjects,
    editions: [{ year: 2025, title: "Balkan MO 2025 — Official Edition", languages: ["en"], subjects: olympiadSubjects, officialProblemsUrl: "https://bmo2025.pmf.unsa.ba/", published: true }],
  },
  {
    slug: "immc",
    shortName: "IMMC",
    name: "International Mathematical Modeling Challenge",
    nameAr: "التحدي الدولي للنمذجة الرياضية",
    descriptionAr: "تحدٍّ جماعي لطلبة المرحلة الثانوية لتطبيق الرياضيات على مشكلات واقعية وكتابة تقرير نمذجة.",
    level: "secondary",
    scope: "international",
    format: "modeling",
    participation: "team",
    region: "global",
    officialUrl: "https://www.immchallenge.org/",
    languages: ["en"],
    subjects: ["modeling", "applied"],
    editions: externalEditions(2015, 2025, (year) => `IMMC ${year} — Official Challenge`, "https://www.immchallenge.org/", ["modeling", "applied"]),
  },
]

export function getWorldCompetition(slug: string) {
  return WORLD_COMPETITIONS.find((competition) => competition.slug === slug) ?? null
}

export function getCompetitionEdition(slug: string, year: number) {
  const competition = getWorldCompetition(slug)
  const edition = competition?.editions.find((item) => item.year === year && item.published) ?? null
  return competition && edition ? { competition, edition } : null
}
