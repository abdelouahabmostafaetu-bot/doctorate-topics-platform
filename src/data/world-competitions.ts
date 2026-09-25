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
  mixed: "مواضيع مختلطة",
}

export const WORLD_COMPETITIONS: WorldCompetition[] = [
  {
    slug: "apmo",
    shortName: "APMO",
    name: "Asian Pacific Mathematical Olympiad",
    nameAr: "أولمبياد آسيا والمحيط الهادئ للرياضيات",
    descriptionAr:
      "مسابقة إقليمية دولية لطلبة المرحلة الثانوية، تتكوّن عادةً من خمس مسائل برهانية في الجبر والهندسة ونظرية الأعداد والتوافقيات.",
    level: "secondary",
    scope: "regional",
    format: "olympiad",
    participation: "individual",
    region: "asia-pacific",
    officialUrl: "https://www.apmo-official.org/",
    languages: ["en"],
    subjects: ["algebra", "geometry", "number-theory", "combinatorics"],
    editions: [
      {
        year: 2025,
        title: "APMO 2025 — Official Problems",
        problemsCount: 5,
        durationMinutes: 240,
        languages: ["en"],
        subjects: ["algebra", "geometry", "number-theory", "combinatorics"],
        officialPdfUrl: "https://www.apmo-official.org/static/problems/apmo2025_prb.pdf",
        officialSolutionPdfUrl: "https://www.apmo-official.org/static/solutions/apmo2025_sol.pdf",
        resultsUrl: "https://www.apmo-official.org/results",
        published: true,
      },
    ],
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
