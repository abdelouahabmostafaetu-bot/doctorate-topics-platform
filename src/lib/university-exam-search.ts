import { GLOBAL_UNIVERSITY_EXAM_SOURCES, UNIVERSITY_EXAM_SUBJECT_LABELS } from "@/data/university-exams";
import { universityExamCountries } from "@/lib/university-exam-navigation";

export type UniversityExamSearchParams = Record<string, string | string[] | undefined>;
export const UNIVERSITY_EXAM_PAGE_SIZE = 24;
const value = (params: UniversityExamSearchParams, key: string) => typeof params[key] === "string" ? params[key] as string : "";

export function searchUniversityExams(params: UniversityExamSearchParams) {
  const countries = universityExamCountries();
  const country = countries.find((item) => item.code.toLowerCase() === value(params, "country").toLowerCase());
  const universities = GLOBAL_UNIVERSITY_EXAM_SOURCES.filter((source) => !country || source.countryCode === country.code)
    .sort((a, b) => a.nameAr.localeCompare(b.nameAr, "ar"));
  const university = universities.find((item) => item.slug === value(params, "university"));
  const eligibleSources = university ? [university] : universities;
  const subjectKeys = [...new Set(eligibleSources.flatMap((source) => source.collections.map((collection) => collection.subject)))];
  const subjects = subjectKeys.map((key) => ({ key, label: UNIVERSITY_EXAM_SUBJECT_LABELS[key] || key })).sort((a, b) => a.label.localeCompare(b.label, "ar"));
  const subject = subjects.find((item) => item.key === value(params, "subject"));
  const allAssets = eligibleSources.flatMap((source) => source.collections
    .filter((collection) => !subject || collection.subject === subject.key)
    .flatMap((collection) => (collection.assets || []).map((asset, assetIndex) => ({ source, collection, asset, assetIndex }))));
  const years = [...new Set(allAssets.map((row) => row.asset.year))].sort((a, b) => b - a);
  const requestedYear = /^\d{4}$/.test(value(params, "year")) ? Number(value(params, "year")) : undefined;
  const year = requestedYear && years.includes(requestedYear) ? requestedYear : undefined;
  const kind = ["solution", "all"].includes(value(params, "kind")) ? value(params, "kind") : "exam";
  const view = value(params, "view") === "universities" ? "universities" : "files";
  const assets = allAssets.filter((row) => (kind === "all" || row.asset.kind === kind) && (view === "universities" || !year || row.asset.year === year))
    .sort((a, b) => b.asset.year - a.asset.year || a.source.nameAr.localeCompare(b.source.nameAr, "ar") || a.collection.titleAr.localeCompare(b.collection.titleAr, "ar") || a.assetIndex - b.assetIndex);
  const sources = eligibleSources.filter((source) => !subject || source.collections.some((collection) => collection.subject === subject.key));
  const total = view === "universities" ? sources.length : assets.length;
  const pageCount = Math.max(1, Math.ceil(total / UNIVERSITY_EXAM_PAGE_SIZE));
  const pageParam = value(params, "page");
  const page = Math.min(pageCount, /^\d+$/.test(pageParam) ? Math.max(1, Number(pageParam) || 1) : 1);
  const query = new URLSearchParams();
  if (country) query.set("country", country.code.toLowerCase());
  if (university) query.set("university", university.slug);
  if (subject) query.set("subject", subject.key);
  if (year && view === "files") query.set("year", String(year));
  if (kind !== "exam" && view === "files") query.set("kind", kind);
  if (view === "universities") query.set("view", view);
  const hasFilters = [...query.keys()].some((key) => key !== "view");
  function link(change: Record<string, string | null> = {}) {
    const next = new URLSearchParams(query);
    for (const [key, val] of Object.entries(change)) { if (val) next.set(key, val); else next.delete(key); }
    const qs = next.toString();
    return `/university-exams${qs ? `?${qs}` : ""}`;
  }
  const offset = (page - 1) * UNIVERSITY_EXAM_PAGE_SIZE;
  return { countries, country, universities, university, subjects, subject, years, year, kind, view, total, page, pageCount, offset, hasFilters, link, assets: assets.slice(offset, offset + UNIVERSITY_EXAM_PAGE_SIZE), sources: sources.slice(offset, offset + UNIVERSITY_EXAM_PAGE_SIZE) };
}
