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
import { COUNTRY_META } from "@/lib/country-meta";
import { COUNTRIES, fallbackCountry, isInternationalSlug } from "@/lib/countries";
import type { Country } from "@/lib/countries";

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

/**
 * تخصصات نطاق معيّن — مشتقّة من المواضيع المنشورة فعليًا حتى لا تمتزج
 * تخصصات الدول مع بعضها: مرِّر "local" لنطاق الموقع الجزائري، أو رمز
 * الدولة (مثل "tw") لدولة أجنبية.
 */
export const getScopedSpecialties = unstable_cache(
  async (scope: string): Promise<FilterEntity[]> => {
    const { universities, specialties } = await getFilterLists();
    const scopedUniversities =
      scope === "local"
        ? universities.filter(
            (university) => !isInternationalSlug(university.slug),
          )
        : universities.filter((university) =>
            university.slug.startsWith(`${scope}-`),
          );
    if (scopedUniversities.length === 0) return [];

    const rows = (await prisma.topic.aggregateRaw({
      pipeline: [
        {
          $match: {
            status: "published",
            universityId: {
              $in: scopedUniversities.map((university) => ({
                $oid: university.id,
              })),
            },
          },
        },
        { $group: { _id: "$specialtyId" } },
      ] as Prisma.InputJsonValue[],
    })) as unknown as Array<{ _id: { $oid: string } }>;

    const ids = new Set(
      rows
        .map((row) => row._id?.$oid)
        .filter((id): id is string => typeof id === "string"),
    );
    return specialties.filter((specialty) => ids.has(specialty.id));
  },
  ["scoped-specialties"],
  { revalidate: 600, tags: [TOPICS_TAG] },
);

// بادئة الجامعات الأجنبية في قاعدة البيانات: رمز ISO-2 ثم " - "
const COUNTRY_NAME_PREFIX = /^([A-Z]{2}) - /;

/**
 * دول صفحة /world — مشتقّة من قاعدة البيانات لا من قائمة ثابتة:
 * كل جامعة اسمها يبدأ بـ "XX - " ولديها موضوع منشور واحد على الأقل
 * تُظهر دولتها. الجامعات الجزائرية (بلا بادئة) لا تظهر هنا أبدًا.
 * الترتيب: ترتيب COUNTRY_META أولًا، ثم الرموز غير المعروفة أبجديًا.
 */
export const getWorldCountries = unstable_cache(
  async (): Promise<Country[]> => {
    const universities = await prisma.university.findMany({
      select: { id: true, name: true },
    });

    const idsByCode = new Map<string, string[]>();
    for (const university of universities) {
      const prefix = COUNTRY_NAME_PREFIX.exec(university.name);
      if (!prefix) continue;
      const ids = idsByCode.get(prefix[1]) ?? [];
      ids.push(university.id);
      idsByCode.set(prefix[1], ids);
    }
    if (idsByCode.size === 0) return [];

    // نُبقي فقط الرموز التي لديها موضوع منشور واحد على الأقل
    const allIds = [...idsByCode.values()].flat();
    const publishedRows = (await prisma.topic.aggregateRaw({
      pipeline: [
        {
          $match: {
            status: "published",
            universityId: {
              $in: allIds.map((id) => ({ $oid: id })),
            },
          },
        },
        { $group: { _id: "$universityId" } },
      ] as Prisma.InputJsonValue[],
    })) as unknown as Array<{ _id: { $oid: string } }>;
    const withPublished = new Set(
      publishedRows
        .map((row) => row._id?.$oid)
        .filter((id): id is string => typeof id === "string"),
    );

    const metaOrder = Object.keys(COUNTRY_META);
    const codes = [...idsByCode.entries()]
      .filter(([, ids]) => ids.some((id) => withPublished.has(id)))
      .map(([code]) => code)
      .sort((a, b) => {
        const indexA = metaOrder.indexOf(a);
        const indexB = metaOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });

    return codes.map(
      (code) =>
        COUNTRIES.find((country) => country.iso === code) ??
        fallbackCountry(code),
    );
  },
  ["world-countries"],
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
