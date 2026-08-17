import manifest from "@/data/drive-math-resources.json";
import { getCncLevelFamily } from "@/lib/cnc-math-catalog";

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

export type DriveResource = DriveManifestResource & {
  sourceCategory: string;
  programName: string;
};

export type DriveProgram = {
  id: string;
  name: string;
  url: string;
  category: string;
  resources: DriveResource[];
};

export type DriveMathUniversity = {
  name: string;
  slug: string;
  nameAr?: string | null;
};

const driveManifest = manifest as DriveManifest;

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
  tamanrasset: ["utam", "tamanrasset"],
};

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

  if ([...sourceWords].some((word) => word.length > 2 && dbWords.has(word))) return true;

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

export function getDriveSource() {
  return driveManifest.source;
}

export function getDriveProgramsForUniversity(
  university: DriveMathUniversity,
  levelValue: string,
): DriveProgram[] {
  return driveManifest.categories.flatMap((category) =>
    category.programs
      .filter((program) => matchesUniversity(program.name, university) && levelMatches(program, category.category, levelValue))
      .map((program) => ({
        id: program.id,
        name: program.name,
        url: program.url,
        category: category.category,
        resources: program.resources.map((resource) => ({
          ...resource,
          name: resource.name.replace(/\\x27/g, "'"),
          sourceCategory: category.category,
          programName: program.name,
        })),
      })),
  );
}
