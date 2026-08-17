import manifest from "@/data/drive-math-resources.json";
import classification from "@/data/drive-math-classification.json";
import { getCncLevelFamily, type CncProgramSummary } from "@/lib/cnc-math-catalog";

type DriveManifestResource = {
  id: string;
  name: string;
  kind: "folder" | "file";
  mimeType: string;
  url: string;
};

type DriveManifestProgram = {
  id: string;
  name: string;
  url: string;
  resources: DriveManifestResource[];
};

type DriveManifestCategory = {
  category: string;
  id: string;
  url: string;
  programs: DriveManifestProgram[];
};

type DriveManifest = {
  source: {
    name: string;
    folderId: string;
    url: string;
    attribution: string;
  };
  categories: DriveManifestCategory[];
};

type ClassificationResource = {
  resourceId: string;
  topicKey: string;
  topicArabic: string;
  semesterHint: "S1" | "S2" | "M1" | "M2" | "L1" | "L2" | "L3" | "both" | "unknown";
  moduleKeywords: string[];
  confidence: "high" | "medium" | "low";
};

type ClassificationProgram = {
  category: string;
  programId: string;
  disciplineKey: string;
  canonicalFrench: string;
  canonicalArabic: string;
  meaningArabic: string;
  confidence: "high" | "medium" | "low";
  resources: ClassificationResource[];
};

type DriveClassification = { programs: ClassificationProgram[] };

export type DriveResource = DriveManifestResource & {
  sourceCategory: string;
  programName: string;
  programId: string;
  disciplineKey: string;
  topicArabic: string;
  semesterHint: ClassificationResource["semesterHint"];
  moduleKeywords: string[];
  confidence: ClassificationResource["confidence"];
};

export type DriveProgram = {
  id: string;
  name: string;
  url: string;
  category: string;
  disciplineKey: string;
  canonicalFrench: string;
  canonicalArabic: string;
  meaningArabic: string;
  resources: DriveResource[];
};

export type DriveMathUniversity = {
  name: string;
  slug: string;
  nameAr?: string | null;
};

const driveManifest = manifest as DriveManifest;
const driveClassification = classification as DriveClassification;
const classificationByProgram = new Map(driveClassification.programs.map((program) => [program.programId, program]));

const UNIVERSITY_ALIASES: Record<string, string[]> = {
  usthb: ["usthb", "houari boumediene"],
  usto: ["usto", "sciences et technologie oran", "oran"],
  umbb: ["umbb", "boumerdes"],
  ubma: ["ubma", "badji mokhtar", "annaba"],
  usdb: ["usdb", "saad dahleb", "blida"],
  sba: ["sba", "sidi bel abbes", "sidi bel abbès"],
  tiaret: ["tiart", "tiaret"],
  bejaia: ["bejaia", "béjaïa"],
  batna: ["batna", "u batna"],
  chlef: ["chlef"],
  adrar: ["adrar"],
  temouchent: ["temouchent", "ain temouchent"],
  constantine: ["constantine", "constantine 1"],
  medea: ["medea", "médea"],
  saida: ["saida", "saïda"],
  jijel: ["jijel"],
  tlemcen: ["tlemcen"],
  ouargla: ["ouargla"],
  "tizi ouzou": ["tizi ouzou"],
  "souk ahras": ["souk ahras"],
  setif: ["setif", "sétif"],
  "tamanrasset": ["utam", "tamanrasset"],
  "alger 1": ["alger 1"],
};

function normalize(value: string) {
  return value
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’'`]/g, " ")
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function universitySearchText(university: DriveMathUniversity) {
  return normalize([university.name, university.nameAr || "", university.slug.replace(/-/g, " ")].join(" "));
}

function programUniversityText(programName: string) {
  const match = programName.match(/\(([^)]+)\)/);
  return normalize(match?.[1] || programName);
}

function matchesUniversity(programName: string, university: DriveMathUniversity) {
  const dbText = universitySearchText(university);
  const dbWords = new Set(dbText.split(" ").filter(Boolean));
  const sourceText = programUniversityText(programName);
  const sourceWords = new Set(sourceText.split(" ").filter(Boolean));

  const meaningfulOverlap = [...sourceWords].filter((word) => word.length > 2 && dbWords.has(word));
  if (meaningfulOverlap.length >= 2) return true;

  return Object.values(UNIVERSITY_ALIASES).some((aliases) => {
    const sourceHit = aliases.some((alias) => sourceText.includes(normalize(alias)));
    const dbHit = aliases.some((alias) => dbText.includes(normalize(alias)));
    return sourceHit && dbHit;
  });
}

function levelMatches(program: DriveManifestProgram, category: string, levelValue: string) {
  const family = getCncLevelFamily(levelValue);
  const directResourceNames = program.resources.map((resource) => normalize(resource.name));
  if (family === "Master") {
    return normalize(category).includes("master") || /^m(?:aster)?\b/.test(normalize(program.name));
  }
  return directResourceNames.some((name) => /^(licence|l[123])\b/.test(name));
}

function specialtyTerms(disciplineKey: string) {
  const terms: Record<string, string[]> = {
    edp: ["edp", "derivees partielles", "equations differentielles", "equations aux derivees partielles", "معادلات تفاضلية جزئية"],
    ro: ["recherche operationnelle", "optimisation", "operations research"],
    mf_actuariat: ["mathematiques financieres", "finance", "actuariat", "gestion"],
    analyse_fonctionnelle: ["analyse fonctionnelle", "equations differentielles fonctionnelles"],
    analyse_appliquee: ["mathematiques appliquees", "analyse et modelisation appliquees", "analyse appliquee", "رياضيات وتطبيقات", "رياضيات تطبيقية"],
    modelisation: ["modelisation", "modelisation mathematique", "controle et systemes"],
    systemes_dynamiques: ["systemes dynamiques", "controle optimal", "dynamique", "جمل دينامكية", "أنظمة ديناميكية"],
    algebre: ["algebre", "arithmetique", "codage", "combinatoire", "جبر"],
    probabilites_statistique: ["probabilites", "statistique", "econometrie", "actuariat"],
    other_math: [],
  };
  return terms[disciplineKey] || [];
}

function matchesSpecialty(program: DriveProgram, cncProgram: CncProgramSummary) {
  const title = normalize([cncProgram.title, cncProgram.label].join(" "));
  const canonical = normalize([program.canonicalFrench, program.canonicalArabic].join(" "));
  const terms = specialtyTerms(program.disciplineKey);
  if (terms.some((term) => title.includes(normalize(term)))) return true;

  const canonicalWords = new Set(canonical.split(" ").filter((word) => word.length > 3));
  const titleWords = new Set(title.split(" ").filter(Boolean));
  const overlap = [...canonicalWords].filter((word) => titleWords.has(word)).length;
  return overlap >= 2;
}

export function getDriveSource() {
  return driveManifest.source;
}

export function getDriveProgramsForUniversity(university: DriveMathUniversity, levelValue: string): DriveProgram[] {
  return driveManifest.categories.flatMap((category) =>
    category.programs
      .filter((program) => matchesUniversity(program.name, university) && levelMatches(program, category.category, levelValue))
      .map((program) => {
        const classified = classificationByProgram.get(program.id);
        if (!classified) return null;
        const classifiedResources = new Map(classified.resources.map((resource) => [resource.resourceId, resource]));
        return {
          id: program.id,
          name: program.name,
          url: program.url,
          category: category.category,
          disciplineKey: classified.disciplineKey,
          canonicalFrench: classified.canonicalFrench,
          canonicalArabic: classified.canonicalArabic,
          meaningArabic: classified.meaningArabic,
          resources: program.resources.map((resource) => {
            const meta = classifiedResources.get(resource.id);
            return {
              ...resource,
              name: resource.name.replace(/\\x27/g, "'"),
              sourceCategory: category.category,
              programName: program.name,
              programId: program.id,
              disciplineKey: classified.disciplineKey,
              topicArabic: meta?.topicArabic || classified.canonicalArabic,
              semesterHint: meta?.semesterHint || "unknown",
              moduleKeywords: meta?.moduleKeywords || [],
              confidence: meta?.confidence || "low",
            };
          }),
        } satisfies DriveProgram;
      })
      .filter((program): program is DriveProgram => Boolean(program)),
  );
}

export function getDriveResourcesForCncProgram(
  university: DriveMathUniversity,
  levelValue: string,
  cncProgram: CncProgramSummary,
  allCncPrograms: CncProgramSummary[],
) {
  const drivePrograms = getDriveProgramsForUniversity(university, levelValue);
  const matching = drivePrograms.filter((program) => matchesSpecialty(program, cncProgram));
  if (matching.length || allCncPrograms.length !== 1) return matching.flatMap((program) => program.resources);
  return drivePrograms.flatMap((program) => program.resources);
}

function resourceMatchesModule(resource: DriveResource, moduleName: string, semester: number) {
  const moduleText = normalize(moduleName);
  const keywordHit = resource.moduleKeywords.some((keyword) => {
    const keywordText = normalize(keyword);
    return Boolean(keywordText) && (moduleText.includes(keywordText) || keywordText.includes(moduleText));
  });
  if (!keywordHit) return false;

  if (resource.semesterHint === "S1" || resource.semesterHint === "M1") return semester === 1;
  if (resource.semesterHint === "S2" || resource.semesterHint === "M2") return semester === 2;
  return true;
}

export function getDriveResourcesForModule(
  university: DriveMathUniversity,
  levelValue: string,
  moduleName: string,
  semester: number,
) {
  return getDriveProgramsForUniversity(university, levelValue)
    .flatMap((program) => program.resources)
    .filter((resource) => resourceMatchesModule(resource, moduleName, semester));
}
