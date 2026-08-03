import { MeiliSearch, type Index } from "meilisearch";

export const THESES_INDEX = "theses";

export type ThesisHit = {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
  supervisors: string[];
  keywords: string[];
  year: number | null;
  degree: string;
  degreeAr: string;
  branch: string;
  branchAr: string;
  uniSlug: string;
  uniAr: string;
  uniFr: string;
  wilaya: string;
  lang: string;
  landingUrl: string;
  hasPdf: boolean;
};

let admin: MeiliSearch | null = null;

/** Admin client (server side only). Needs MEILI_HOST + MEILI_MASTER_KEY. */
export function meiliAdmin(): MeiliSearch {
  if (admin) return admin;
  const host = process.env.MEILI_HOST;
  const apiKey = process.env.MEILI_MASTER_KEY;
  if (!host) throw new Error("MEILI_HOST is missing");
  if (!apiKey) throw new Error("MEILI_MASTER_KEY is missing");
  admin = new MeiliSearch({ host, apiKey });
  return admin;
}

/** True when Meilisearch is configured. Lets the UI fall back to Mongo. */
export function meiliEnabled(): boolean {
  return Boolean(process.env.MEILI_HOST && process.env.MEILI_MASTER_KEY);
}

export async function thesesIndex(): Promise<Index<ThesisHit>> {
  return meiliAdmin().index<ThesisHit>(THESES_INDEX);
}

/**
 * Arabic needs its own synonym table: students type "دكتورا" or "phd" and
 * still expect "دكتوراه". Meilisearch synonyms are one-directional per key,
 * so every variant is listed explicitly.
 */
const SYNONYMS: Record<string, string[]> = {
  "دكتوراه": ["دكتورا", "doctorat", "phd", "doctorate"],
  "doctorat": ["دكتوراه", "phd", "doctorate"],
  "phd": ["دكتوراه", "doctorat"],
  "ماجستير": ["ماجيستر", "magister", "magistere"],
  "magister": ["ماجستير", "magistere"],
  "ماستر": ["master", "mastere"],
  "master": ["ماستر"],
  "رياضيات": ["mathematiques", "mathematics", "maths", "math"],
  "mathematiques": ["رياضيات", "mathematics", "maths"],
  "تحليل دالي": ["analyse fonctionnelle", "functional analysis"],
  "معادلات تفاضلية": ["equations differentielles", "differential equations"],
  "احتمالات": ["probabilites", "probability"],
  "احصاء": ["statistique", "statistics"],
  "جبر": ["algebre", "algebra"],
  "هندسة": ["geometrie", "geometry"],
  "طوبولوجيا": ["topologie", "topology"],
  "امثلية": ["optimisation", "optimization"],
  "تشفير": ["cryptographie", "cryptography"],
};

/** Idempotent: safe to run on every deploy or reindex. */
export async function applySettings(): Promise<void> {
  const index = await thesesIndex();
  await index.updateSettings({
    searchableAttributes: [
      "title",
      "authors",
      "supervisors",
      "keywords",
      "abstract",
      "uniAr",
      "uniFr",
    ],
    filterableAttributes: [
      "uniSlug",
      "degree",
      "branch",
      "year",
      "lang",
      "hasPdf",
      "wilaya",
    ],
    sortableAttributes: ["year"],
    displayedAttributes: ["*"],
    rankingRules: [
      "words",
      "typo",
      "proximity",
      "attribute",
      "sort",
      "exactness",
      "year:desc",
    ],
    typoTolerance: {
      enabled: true,
      minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 },
    },
    synonyms: SYNONYMS,
    pagination: { maxTotalHits: 100000 },
    faceting: { maxValuesPerFacet: 200 },
  });
}
