import rawCatalog from "@/data/cnc-math.json";

type CncModule = {
  number: string;
  name: string;
  nameAr: string;
  type: string;
  credits: string;
  coefficient: string;
};

type CncSemester = {
  name: string;
  modules: CncModule[];
};

type CncCertificate = {
  id: string;
  code: string;
  label: string;
  title: string;
  level: string;
  institutions: string[];
  semesters: CncSemester[];
};

type CncUniversity = {
  id: string;
  key: string;
  name: string;
  nameAr: string;
  portalUrl: string;
  host: string;
  certificates: number;
  levels: Record<string, number>;
};

type CncCatalog = {
  source: string;
  sourceLabel: string;
  certificateCount: number;
  universityCount: number;
  moduleCount: number;
  universities: CncUniversity[];
  certificates: CncCertificate[];
};

export type CncProgramSummary = {
  id: string;
  code: string;
  title: string;
  label: string;
  level: string;
  semesterCount: number;
  moduleCount: number;
  semesters: CncSemester[];
};

export type CncUniversitySummary = {
  programCount: number;
  moduleCount: number;
  semesterCount: number;
  levels: string[];
  programs: CncProgramSummary[];
  portalUrl: string | null;
  logoUrl: string | null;
};

type UniversityLike = {
  slug: string;
  name: string;
  nameAr?: string | null;
  logoUrl?: string | null;
};

const catalog = rawCatalog as unknown as CncCatalog;

const STOP_WORDS = new Set([
  "universite",
  "université",
  "univ",
  "de",
  "des",
  "du",
  "d",
  "la",
  "le",
  "les",
  "et",
  "en",
  "a",
  "aux",
  "centre",
  "universitaire",
  "sciences",
  "technologie",
  "ecole",
  "école",
  "nationale",
  "superieure",
  "supérieure",
]);

function normalize(value: string) {
  return value
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’'`]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function significantWords(value: string) {
  return new Set(normalize(value).split(" ").filter((word) => word.length > 0 && !STOP_WORDS.has(word)));
}

function matchesInstitution(university: UniversityLike, institution: string) {
  const dbCandidates = [university.name, university.slug.replace(/-/g, " ")].map(significantWords);
  const sourceWords = significantWords(institution);

  return dbCandidates.some((candidate) => {
    if (!candidate.size || !sourceWords.size) return false;
    const overlap = [...candidate].filter((word) => sourceWords.has(word)).length;
    const minimum = candidate.size <= 2 ? candidate.size : 2;
    return overlap >= minimum;
  });
}

function findCncUniversity(university: UniversityLike) {
  return catalog.universities.find((candidate) => matchesInstitution(university, candidate.name));
}

function validPortalUrl(value: string | null | undefined) {
  return value && /^https?:\/\//i.test(value) ? value : null;
}

function programSummary(certificate: CncCertificate): CncProgramSummary {
  return {
    id: certificate.id,
    code: certificate.code,
    title: certificate.title || certificate.label,
    label: certificate.label,
    level: certificate.level,
    semesterCount: certificate.semesters.length,
    moduleCount: certificate.semesters.reduce((total, semester) => total + semester.modules.length, 0),
    semesters: certificate.semesters,
  };
}

export function getCncSummary(university: UniversityLike): CncUniversitySummary {
  const cncUniversity = findCncUniversity(university);
  const programs = catalog.certificates
    .filter((certificate) => certificate.institutions.some((institution) => matchesInstitution(university, institution)))
    .map(programSummary)
    .sort((a, b) => a.level.localeCompare(b.level) || a.title.localeCompare(b.title, "ar"));

  const levels = [...new Set(programs.map((program) => program.level))];
  const portalUrl = validPortalUrl(cncUniversity?.portalUrl) ?? null;
  const logoUrl = university.logoUrl || (cncUniversity?.host && cncUniversity.host !== "outils-recherche" ? `https://${cncUniversity.host}/favicon.ico` : null);

  return {
    programCount: programs.length,
    moduleCount: programs.reduce((total, program) => total + program.moduleCount, 0),
    semesterCount: programs.reduce((total, program) => total + program.semesterCount, 0),
    levels,
    programs,
    portalUrl,
    logoUrl,
  };
}

export function cncSourceUrl() {
  return catalog.source;
}

export function cncCatalogStats() {
  return {
    certificateCount: catalog.certificateCount,
    universityCount: catalog.universityCount,
    moduleCount: catalog.moduleCount,
  };
}

export function levelLabel(value: string) {
  if (value === "Licence") return "ليسانس";
  if (value === "Master") return "ماستر";
  if (value.includes("Ingénieur") || value.includes("École")) return "مدرسة / مهندس";
  if (value.includes("Doctorat")) return "دكتوراه";
  return value;
}

export function moduleTypeLabel(value: string) {
  if (value === "Fondamentale") return "أساسية";
  if (value === "Méthodologie") return "منهجية";
  if (value === "Transversale") return "عرضية";
  if (value === "Découverte") return "استكشافية";
  return value;
}

export function getCncPrograms(university: UniversityLike) {
  return getCncSummary(university).programs;
}

export function normalizeCatalogText(value: string) {
  return normalize(value).replace(/[^a-z0-9\u0600-\u06ff]+/g, "");
}

export function getCncLevelFamily(levelValue: string) {
  return levelValue.startsWith("M") ? "Master" : "Licence";
}

export function getCncSemesterRange(levelValue: string) {
  if (levelValue === "L1" || levelValue === "M1") return [1, 2];
  if (levelValue === "L2" || levelValue === "M2") return [3, 4];
  if (levelValue === "L3") return [5, 6];
  return [];
}

export function getCncSemesterNumber(name: string) {
  const match = name.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

export function cncModuleKey(name: string, semester: number | null | undefined) {
  return `${normalizeCatalogText(name)}::${semester ?? ""}`;
}

export function getCncProgramsForLevel(university: UniversityLike, levelValue: string) {
  const family = getCncLevelFamily(levelValue);
  const range = getCncSemesterRange(levelValue);
  return getCncSummary(university).programs
    .filter((program) => program.level === family)
    .map((program) => ({
      ...program,
      semesters: program.semesters.filter((semester) => {
        const number = getCncSemesterNumber(semester.name);
        return !range.length || number === null || range.includes(number);
      }),
    }))
    .filter((program) => program.semesters.length > 0);
}

export function getCncProgramById(id: string) {
  const certificate = catalog.certificates.find((item) => item.id === id);
  return certificate ? programSummary(certificate) : null;
}

export function getCncUniversityPortal(university: UniversityLike) {
  return getCncSummary(university).portalUrl;
}

export function getCncUniversityLogo(university: UniversityLike) {
  return getCncSummary(university).logoUrl;
}

export function getCncSource() {
  return cncSourceUrl();
}

export function getCncStats() {
  return cncCatalogStats();
}

export function hasCncProgram(university: UniversityLike) {
  return getCncSummary(university).programCount > 0;
}

export function getCncCertificateCount(university: UniversityLike) {
  return getCncSummary(university).programCount;
}

export function getCncModuleCount(university: UniversityLike) {
  return getCncSummary(university).moduleCount;
}

export function getCncSemesterCount(university: UniversityLike) {
  return getCncSummary(university).semesterCount;
}

export function getCncLevelLabels(university: UniversityLike) {
  return getCncSummary(university).levels.map(levelLabel);
}

export function getCncProgramTitle(program: CncProgramSummary) {
  return program.title || program.label;
}

export function getCncModuleTitle(module: CncModule) {
  return module.nameAr?.trim() || module.name;
}

export function getCncModuleMeta(module: CncModule) {
  return [module.type && moduleTypeLabel(module.type), module.credits, module.coefficient].filter(Boolean).join(" · ");
}
