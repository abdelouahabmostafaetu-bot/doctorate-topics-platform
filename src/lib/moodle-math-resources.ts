import manifest from "@/data/moodle-math-resources.json";
import { cncModuleKey, getCncLevelFamily, normalizeCatalogText, type CncProgramSummary } from "@/lib/cnc-math-catalog";

type OfficialModule = {
  certificateId: string;
  certificateCode: string;
  specialty: string;
  level: string;
  semester: string;
  module: string;
  moduleAr: string;
  moduleType: string;
  score: number;
};

type MoodleManifestResource = {
  id: string;
  universitySlug: string;
  university: string;
  courseName: string;
  courseUrl: string;
  sourceCategoryPath: string[];
  resourceLabel: string;
  resourceType: "Cours" | "TD" | "TP" | "Autre";
  sourceUrl: string;
  sourceAttribution: string;
  accessStatus: string;
  uploadCandidate: boolean;
  mappingStatus: "auto" | "needs_review" | "unmapped";
  officialModule: OfficialModule | null;
  officialModuleCandidates: OfficialModule[];
  sourceSemesterHint: string | null;
  specialtyHint: string | null;
  permissionNote: string;
};

type MoodleManifest = {
  resources: MoodleManifestResource[];
};

export type MoodleResource = MoodleManifestResource & {
  sourceCategory: string;
  title: string;
  semesterNumber: number | null;
};

const moodleManifest = manifest as MoodleManifest;

function semesterNumber(value: string | null | undefined) {
  const match = value?.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function moduleMatches(resource: MoodleResource, moduleName: string, semester: number | null | undefined) {
  const official = resource.officialModule;
  if (!official) return false;
  const exactName = normalizeCatalogText(official.module) === normalizeCatalogText(moduleName);
  const exactSemester = resource.semesterNumber === null || semester === null || semester === undefined || resource.semesterNumber === semester;
  return exactName && exactSemester;
}

function levelMatches(resource: MoodleResource, levelValue: string) {
  return resource.officialModule?.level === getCncLevelFamily(levelValue);
}

function toResource(resource: MoodleManifestResource): MoodleResource {
  return {
    ...resource,
    title: resource.resourceLabel || resource.courseName,
    sourceCategory: resource.sourceCategoryPath.join(" / "),
    semesterNumber: semesterNumber(resource.officialModule?.semester || resource.sourceSemesterHint),
  };
}

const resources = moodleManifest.resources.map(toResource);

export function getMoodleSource() {
  return {
    name: "Moodle الجامعات الجزائرية",
    attribution: "روابط أصلية من منصتي التعليم الإلكتروني لجامعتي ميلة وجيجل",
  };
}

export function getMoodleResourcesForCncProgram(
  university: { slug: string },
  levelValue: string,
  program: CncProgramSummary,
): MoodleResource[] {
  return resources.filter(
    (resource) =>
      resource.universitySlug === university.slug &&
      levelMatches(resource, levelValue) &&
      resource.officialModule?.certificateId === program.id,
  );
}

export function getMoodleResourcesForModule(
  universitySlug: string,
  levelValue: string,
  moduleName: string,
  semester: number | null | undefined,
) {
  return resources.filter(
    (resource) =>
      resource.universitySlug === universitySlug &&
      levelMatches(resource, levelValue) &&
      moduleMatches(resource, moduleName, semester),
  );
}

export function getMoodleResourceCountForProgram(
  university: { slug: string },
  levelValue: string,
  program: CncProgramSummary,
) {
  return getMoodleResourcesForCncProgram(university, levelValue, program).length;
}

export function getMoodleModuleKey(resource: MoodleResource) {
  return cncModuleKey(resource.officialModule?.module || resource.courseName, resource.semesterNumber);
}
