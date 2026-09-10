import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { COUNTRIES } from "@/lib/countries";
import { TOPICS_TAG } from "@/lib/topic-cache";

export type ScopedUniversity = {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
};

export type ScopedSpecialty = {
  id: string;
  nameAr: string;
  slug: string;
};

export type TopicScope = {
  universities: ScopedUniversity[];
  specialties: ScopedSpecialty[];
  years: number[];
};

/**
 * Returns the ISO-2 code for an international university.
 * The canonical `XX - University` name prefix wins. Known slug prefixes are
 * accepted only as a legacy fallback, so Algerian slugs such as `el-oued`
 * cannot accidentally become a foreign country.
 */
export function getUniversityCountryCode(university: {
  name: string;
  slug: string;
}): string | null {
  const canonical = /^([a-z]{2})\s*-\s+/i.exec(university.name.trim());
  if (canonical) return canonical[1].toUpperCase();

  const legacy = COUNTRIES.find((country) =>
    university.slug.toLowerCase().startsWith(`${country.code}-`),
  );
  return legacy?.iso ?? null;
}

function belongsToScope(
  university: { name: string; slug: string },
  scope: string,
): boolean {
  const code = getUniversityCountryCode(university);
  return scope === "local" ? code === null : code === scope.toUpperCase();
}

/**
 * One source of truth for filter options. Every returned university,
 * specialty and year is backed by at least one published topic in the scope.
 */
export const getTopicScope = unstable_cache(
  async (scope: string): Promise<TopicScope> => {
    const allUniversities = await prisma.university.findMany({
      orderBy: { nameAr: "asc" },
      select: { id: true, name: true, nameAr: true, slug: true },
    });
    const candidateUniversities = allUniversities.filter((university) =>
      belongsToScope(university, scope),
    );
    if (candidateUniversities.length === 0) {
      return { universities: [], specialties: [], years: [] };
    }

    const topics = await prisma.topic.findMany({
      where: {
        status: "published",
        universityId: { in: candidateUniversities.map((item) => item.id) },
      },
      select: { universityId: true, specialtyId: true, year: true },
    });

    const usedUniversityIds = new Set(topics.map((topic) => topic.universityId));
    const usedSpecialtyIds = [...new Set(topics.map((topic) => topic.specialtyId))];
    const specialties = usedSpecialtyIds.length
      ? await prisma.specialty.findMany({
          where: { id: { in: usedSpecialtyIds } },
          orderBy: { nameAr: "asc" },
          select: { id: true, slug: true, nameAr: true },
        })
      : [];

    return {
      universities: candidateUniversities.filter((university) =>
        usedUniversityIds.has(university.id),
      ),
      specialties,
      years: [...new Set(topics.map((topic) => topic.year))].sort((a, b) => b - a),
    };
  },
  ["topic-scope-v1"],
  { revalidate: 600, tags: [TOPICS_TAG] },
);
