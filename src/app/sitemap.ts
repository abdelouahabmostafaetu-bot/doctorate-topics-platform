import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { COUNTRIES } from "@/lib/countries";
import { WORLD_COMPETITIONS } from "@/data/world-competitions";
import { GLOBAL_UNIVERSITY_EXAM_SOURCES } from "@/data/university-exams";
import { universityExamCountries } from "@/lib/university-exam-navigation";

export const revalidate = 3600;

const BASE = "https://www.docmathdz.dev";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/search`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/competitions`, changeFrequency: "weekly", priority: 0.85 },
    { url: `${BASE}/university-exams`, changeFrequency: "weekly", priority: 0.85 },
    ...universityExamCountries().map((country) => ({
      url: `${BASE}/university-exams/country/${country.code.toLowerCase()}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...GLOBAL_UNIVERSITY_EXAM_SOURCES.map((source) => ({
      url: `${BASE}/university-exams/${source.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    })),
    ...GLOBAL_UNIVERSITY_EXAM_SOURCES.flatMap((source) =>
      [...new Set(source.collections.map((collection) => collection.subject))].map(
        (subject) => ({
          url: `${BASE}/university-exams/${source.slug}/subject/${subject}`,
          changeFrequency: "weekly" as const,
          priority: 0.72,
        }),
      ),
    ),
    ...WORLD_COMPETITIONS.flatMap((competition) => [
      {
        url: `${BASE}/competitions/${competition.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.75,
      },
      ...competition.editions
        .filter((edition) => edition.published)
        .map((edition) => ({
          url: `${BASE}/competitions/${competition.slug}/${edition.year}`,
          changeFrequency: "monthly" as const,
          priority: 0.7,
        })),
    ]),
    { url: `${BASE}/world`, changeFrequency: "daily", priority: 0.8 },
    ...COUNTRIES.map((country) => ({
      url: `${BASE}/world/${country.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    { url: `${BASE}/universities`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/contribute`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/contributors`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE}/latex-guide`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/coffee`, changeFrequency: "monthly", priority: 0.3 },
  ];

  try {
    const [topics, universities] = await Promise.all([
      prisma.topic.findMany({
        where: { status: "published" },
        select: { slug: true, updatedAt: true },
      }),
      prisma.university.findMany({ select: { slug: true } }),
    ]);

    const topicPages: MetadataRoute.Sitemap = topics.map((topic) => ({
      url: `${BASE}/topics/${topic.slug}`,
      lastModified: topic.updatedAt,
      changeFrequency: "monthly",
      priority: 0.7,
    }));

    const universityPages: MetadataRoute.Sitemap = universities.map((university) => ({
      url: `${BASE}/universities/${university.slug}`,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

    return [...staticPages, ...universityPages, ...topicPages];
  } catch {
    return staticPages;
  }
}
