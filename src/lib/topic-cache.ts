// طبقة تخزين للبيانات المرجعية الثقيلة
//
// القاعدة: ما يتغيّر عند نشر المدير لموضوع لا يجوز إعادة حسابه عند كل زيارة.
// قائمة الجامعات والتخصصات والسنوات، وترتيب المواضيع، والمواضيع المشابهة —
// كلها ثابتة عمليًا بين الزيارات، فنحسبها مرة ونوزّعها على ألف زائر.
//
// لتفريغ التخزين فورًا بعد تعديل إداري: revalidateTag("topics")
import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const TOPICS_TAG = "topics";

export type FilterEntity = { id: string; slug: string; nameAr: string };

export type FilterLists = {
  universities: FilterEntity[];
  specialties: FilterEntity[];
  years: number[];
};

/** قوائم الفلترة — ثلاثة استعلامات تصبح صفرًا في معظم الطلبات */
export const getFilterLists = unstable_cache(
  async (): Promise<FilterLists> => {
    const [universities, specialties, yearsRaw] = await Promise.all([
      prisma.university.findMany({
        orderBy: { nameAr: "asc" },
        select: { id: true, slug: true, nameAr: true },
      }),
      prisma.specialty.findMany({
        orderBy: { nameAr: "asc" },
        select: { id: true, slug: true, nameAr: true },
      }),
      prisma.topic.aggregateRaw({
        pipeline: [
          { $match: { status: "published" } },
          { $group: { _id: "$year" } },
          { $sort: { _id: -1 } },
        ] as Prisma.InputJsonValue[],
      }) as unknown as Promise<Array<{ _id: number }>>,
    ]);

    return {
      universities,
      specialties,
      years: yearsRaw
        .map((y) => y._id)
        .filter((y): y is number => typeof y === "number"),
    };
  },
  ["filter-lists"],
  { revalidate: 600, tags: [TOPICS_TAG] },
);

/** بناء شرط المطابقة من معرّفات جاهزة (لا يلمس قاعدة البيانات) */
export function buildTopicMatch(
  year: number | null,
  universityId: string | null,
  specialtyId: string | null,
): Record<string, Prisma.InputJsonValue> {
  const match: Record<string, Prisma.InputJsonValue> = { status: "published" };
  if (year) match.year = year;
  if (universityId) match.universityId = { $oid: universityId };
  if (specialtyId) match.specialtyId = { $oid: specialtyId };
  return match;
}

export type OrderedTopic = { slug: string; title: string };

/**
 * ترتيب المواضيع ضمن فلترة معيّنة — لأسهم السابق/التالي.
 * كان هذا يقرأ كل المجموعة عند كل فتح موضوع.
 */
export const getOrderedTopics = unstable_cache(
  async (
    year: number | null,
    universityId: string | null,
    specialtyId: string | null,
  ): Promise<OrderedTopic[]> => {
    const rows = (await prisma.topic.aggregateRaw({
      pipeline: [
        { $match: buildTopicMatch(year, universityId, specialtyId) },
        { $sort: { year: -1, examNumber: 1 } },
        { $project: { _id: 0, slug: 1, title: 1 } },
      ] as Prisma.InputJsonValue[],
    })) as unknown as OrderedTopic[];
    return rows;
  },
  ["ordered-topics"],
  { revalidate: 600, tags: [TOPICS_TAG] },
);

export type RelatedTopic = {
  slug: string;
  year: number;
  examNumber: number | null;
  universityName: string;
  shared: number;
};

/** مواضيع تشترك في المحاور — تجميع ثقيل لا يتغيّر إلا عند إضافة موضوع */
export const getRelatedTopics = unstable_cache(
  async (slug: string, tags: string[]): Promise<RelatedTopic[]> => {
    if (tags.length === 0) return [];
    try {
      const rawRelated = (await prisma.topic.aggregateRaw({
        pipeline: [
          {
            $match: {
              status: "published",
              slug: { $ne: slug },
              "problems.tags": { $in: tags },
            },
          },
          {
            $project: {
              slug: 1,
              year: 1,
              examNumber: 1,
              universityId: 1,
              shared: {
                $size: {
                  $setIntersection: [
                    tags,
                    {
                      $reduce: {
                        input: "$problems",
                        initialValue: [],
                        in: { $setUnion: ["$$value", "$$this.tags"] },
                      },
                    },
                  ],
                },
              },
            },
          },
          { $sort: { shared: -1, year: -1 } },
          { $limit: 3 },
        ] as Prisma.InputJsonValue[],
      })) as unknown as Array<{
        slug: string;
        year: number;
        examNumber: number | null;
        universityId: { $oid: string };
        shared: number;
      }>;

      if (rawRelated.length === 0) return [];

      const unis = await prisma.university.findMany({
        where: { id: { in: rawRelated.map((r) => r.universityId.$oid) } },
        select: { id: true, nameAr: true },
      });

      return rawRelated.map((r) => ({
        slug: r.slug,
        year: r.year,
        examNumber: r.examNumber ?? null,
        shared: r.shared,
        universityName:
          unis.find((u) => u.id === r.universityId.$oid)?.nameAr ?? "\u2014",
      }));
    } catch {
      return [];
    }
  },
  ["related-topics"],
  { revalidate: 3600, tags: [TOPICS_TAG] },
);
