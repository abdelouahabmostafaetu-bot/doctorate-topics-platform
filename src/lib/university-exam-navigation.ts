import {
  GLOBAL_UNIVERSITY_EXAM_SOURCES,
  type UniversityExamCollection,
  type UniversityExamSource,
} from "@/data/university-exams";

export const UNIVERSITY_EXAM_SUBJECT_ENGLISH: Record<string, string> = {
  analysis: "Analysis",
  algebra: "Algebra",
  calculus: "Calculus",
  "differential-equations": "Differential Equations",
  probability: "Probability",
  statistics: "Statistics",
  "numerical-analysis": "Numerical Analysis",
  geometry: "Geometry",
  topology: "Topology",
  modeling: "Mathematical Modeling",
  mixed: "General Mathematics",
};

export function countryFlag(countryCode: string) {
  return countryCode
    .toUpperCase()
    .replace(/[A-Z]/g, (letter) =>
      String.fromCodePoint(127397 + letter.charCodeAt(0)),
    );
}

export function directAssetCount(source: UniversityExamSource) {
  return source.collections.reduce(
    (total, collection) => total + (collection.assets?.length || 0),
    0,
  );
}

export function examCount(source: UniversityExamSource) {
  return source.collections.reduce(
    (total, collection) =>
      total +
      (collection.assets?.filter((asset) => asset.kind === "exam").length || 0),
    0,
  );
}

export function subjectsForSource(source: UniversityExamSource) {
  const grouped = new Map<
    string,
    {
      key: string;
      collections: UniversityExamCollection[];
      assetCount: number;
      examCount: number;
    }
  >();

  for (const collection of source.collections) {
    const current = grouped.get(collection.subject) || {
      key: collection.subject,
      collections: [],
      assetCount: 0,
      examCount: 0,
    };
    current.collections.push(collection);
    current.assetCount += collection.assets?.length || 0;
    current.examCount +=
      collection.assets?.filter((asset) => asset.kind === "exam").length || 0;
    grouped.set(collection.subject, current);
  }

  return [...grouped.values()].sort(
    (a, b) =>
      b.assetCount - a.assetCount ||
      (UNIVERSITY_EXAM_SUBJECT_ENGLISH[a.key] || a.key).localeCompare(
        UNIVERSITY_EXAM_SUBJECT_ENGLISH[b.key] || b.key,
      ),
  );
}

export function universityExamCountries() {
  const grouped = new Map<
    string,
    {
      code: string;
      name: string;
      nameAr: string;
      region: string;
      universities: UniversityExamSource[];
      collections: number;
      exams: number;
    }
  >();

  for (const source of GLOBAL_UNIVERSITY_EXAM_SOURCES) {
    const current = grouped.get(source.countryCode) || {
      code: source.countryCode,
      name: source.country,
      nameAr: source.countryAr,
      region: source.region,
      universities: [],
      collections: 0,
      exams: 0,
    };
    current.universities.push(source);
    current.collections += source.collections.length;
    current.exams += examCount(source);
    grouped.set(source.countryCode, current);
  }

  return [...grouped.values()].sort(
    (a, b) =>
      b.universities.length - a.universities.length ||
      a.name.localeCompare(b.name),
  );
}

export function getUniversityExamCountry(code: string) {
  return (
    universityExamCountries().find(
      (country) => country.code.toLowerCase() === code.toLowerCase(),
    ) || null
  );
}