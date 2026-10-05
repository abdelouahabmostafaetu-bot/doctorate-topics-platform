import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { copyExamPdfFromUrl, deleteExamFile } from "@/lib/exam-storage";
import { rasterizeExamPdf } from "@/lib/exam-page-images";
import {
  allocateManualLegacyId,
  ensureSpecialty,
  ensureUniversity,
  uniqueTopicSlug,
} from "@/lib/topic-helpers";
import { TOPICS_TAG } from "@/lib/topic-cache";
import {
  getTinyFishCampaign,
  TINYFISH_WORLD_CAMPAIGNS,
} from "@/lib/tinyfish-world";
import {
  getVerifiedPhdExam,
  GLOBAL_PHD_RESEARCH_BATCH,
  type VerifiedPhdExam,
} from "@/lib/global-phd-research";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

type SearchResult = {
  title?: string;
  snippet?: string;
  url?: string;
};

async function allowed() {
  return (await auth())?.user?.role === "SUPER_ADMIN";
}

function yearFrom(value: string) {
  const current = new Date().getFullYear() + 1;
  const years = [...value.matchAll(/\b(19\d{2}|20\d{2})\b/g)]
    .map((match) => Number(match[1]))
    .filter((year) => year >= 1950 && year <= current);
  return years.length ? Math.max(...years) : null;
}

function officialPdfUrl(raw: string, domain: string) {
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:") return null;
    if (host !== domain && !host.endsWith(`.${domain}`)) return null;
    if (!url.pathname.toLowerCase().endsWith(".pdf")) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

async function isRealPdf(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        Range: "bytes=0-7",
        Accept: "application/pdf,*/*",
        "User-Agent": "DocMathDZ-TinyFish-Verifier/1.0",
      },
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok || !response.body) return false;
    const reader = response.body.getReader();
    const first = await reader.read();
    await reader.cancel().catch(() => undefined);
    const bytes = first.value || new Uint8Array();
    return new TextDecoder("ascii").decode(bytes.slice(0, 5)) === "%PDF-";
  } catch {
    return false;
  }
}

async function tinyFishSearch(
  apiKey: string,
  domain: string,
  query: string,
) {
  const params = new URLSearchParams({
    query: `site:${domain} filetype:pdf ${query}`,
    purpose:
      "Find official mathematics PhD entrance, qualifying, preliminary, or comprehensive examination PDF files.",
  });
  const response = await fetch(
    `https://api.search.tinyfish.ai?${params.toString()}`,
    {
      headers: { "X-API-Key": apiKey },
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) throw new Error(`TinyFish HTTP ${response.status}`);
  const payload = (await response.json()) as { results?: SearchResult[] };
  return Array.isArray(payload.results) ? payload.results : [];
}

async function importExam(
  campaign: NonNullable<ReturnType<typeof getTinyFishCampaign>>,
  result: SearchResult,
  url: string,
  year: number,
) {
  return importVerifiedExam({
    countryCode: campaign.countryCode,
    country: "",
    countryAr: campaign.countryAr,
    university: `${campaign.countryCode} - ${campaign.university}`,
    universityAr: campaign.universityAr,
    department: "Department of Mathematics",
    specialty: "Mathematics",
    specialtyAr: "الرياضيات",
    year,
    examType: "specialty",
    examNumber: 0,
    title:
      String(result.title || "").replace(/\s+/g, " ").trim().slice(0, 180) ||
      `Mathematics PhD examination ${year}`,
    titleAr:
      String(result.title || "").replace(/\s+/g, " ").trim().slice(0, 180) ||
      `اختبار دكتوراه الرياضيات ${year} — ${campaign.universityAr}`,
    durationMinutes: 180,
    coefficient: null,
    language: "English",
    pdfUrl: url,
    sourceUrl: url,
    officialDomain: campaign.domain,
    fileName:
      new URL(url).pathname.split("/").pop()?.slice(0, 120) ||
      `exam-${year}.pdf`,
    generateReader: true,
  });
}

async function resumeExistingExam(existing: {
  id: string;
  slug: string;
  status: string;
  files: Array<{ kind: string; url: string }>;
}) {
  if (existing.status === "published") {
    return { action: "existing", slug: existing.slug };
  }
  const pdf = existing.files.find((file) => file.kind === "exam_pdf");
  if (!pdf) return null;
  try {
    const readerPages = (await rasterizeExamPdf(pdf.url)).pageCount;
    if (!readerPages) return null;
    await prisma.topic.update({
      where: { id: existing.id },
      data: { status: "published" },
    });
    return { action: "repaired", slug: existing.slug, readerPages };
  } catch {
    return null;
  }
}

async function importVerifiedExam(exam: VerifiedPhdExam) {
  const officialUrl = officialPdfUrl(exam.pdfUrl, exam.officialDomain);
  if (!officialUrl) throw new Error("PDF URL is not on the official domain");

  const existing = await prisma.topic.findFirst({
    where: { source: officialUrl },
    select: { id: true, slug: true, status: true, files: true },
  });
  if (existing) {
    const resumed = await resumeExistingExam(existing);
    if (resumed) return { ...resumed, url: officialUrl };
    for (const file of existing.files) {
      await deleteExamFile(file.url).catch(() => undefined);
    }
    await prisma.topic.delete({ where: { id: existing.id } });
  }

  const [university, specialty] = await Promise.all([
    ensureUniversity({
      name: exam.university,
      nameAr: exam.universityAr,
    }),
    ensureSpecialty({
      name: exam.specialty,
      nameAr: exam.specialtyAr,
    }),
  ]);
  const examNumber = exam.examNumber > 0
    ? exam.examNumber
    : (await prisma.topic.count({
        where: {
          universityId: university.id,
          specialtyId: specialty.id,
          year: exam.year,
        },
      })) + 1;
  const slug = await uniqueTopicSlug(
    `${exam.countryCode}-${exam.university}-${exam.specialty}-${exam.year}-${examNumber}`,
  );
  const topic = await prisma.topic.create({
    data: {
      legacyId: await allocateManualLegacyId(),
      slug,
      title: (exam.titleAr || exam.title).slice(0, 240),
      examType: exam.examType,
      year: exam.year,
      examNumber,
      durationMinutes: exam.durationMinutes,
      coefficient: exam.coefficient,
      universityId: university.id,
      specialtyId: specialty.id,
      source: officialUrl,
      problems: [],
      files: [],
      // لا ننشره في /world قبل نجاح تجهيز القارئ نفسه المستعمل في صفحة الموضوع.
      status: "draft",
    },
  });

  try {
    const fileName = exam.fileName.slice(0, 160);
    const safeBlobName = fileName.replace(/[^a-zA-Z0-9._-]+/g, "-");
    const copied = await copyExamPdfFromUrl(
      officialUrl,
      `exams/topics/${topic.id}/exam_pdf-${Date.now()}-${safeBlobName}`,
      fileName,
    );
    await prisma.topic.update({
      where: { id: topic.id },
      data: {
        files: {
          set: [
            {
              kind: "exam_pdf",
              url: copied.url,
              fileName,
              sizeBytes: copied.sizeBytes,
              uploadedAt: new Date(),
            },
          ],
        },
      },
    });
    let readerPages: number | null = null;
    let readerError: string | null = null;
    try {
      readerPages = (await rasterizeExamPdf(copied.url)).pageCount;
    } catch (error) {
      readerError =
        error instanceof Error ? error.message : "reader_generation_failed";
    }
    if (readerPages && readerPages > 0) {
      await prisma.topic.update({
        where: { id: topic.id },
        data: { status: "published" },
      });
      return { action: "created", slug, url: officialUrl, readerPages };
    }
    return {
      action: "draft_reader_failed",
      slug,
      url: officialUrl,
      readerPages: null,
      readerError,
    };
  } catch (error) {
    const fresh = await prisma.topic.findUnique({
      where: { id: topic.id },
      select: { files: true },
    });
    for (const file of fresh?.files || []) {
      await deleteExamFile(file.url).catch(() => undefined);
    }
    await prisma.topic.delete({ where: { id: topic.id } }).catch(() => undefined);
    throw error;
  }
}

export async function GET() {
  if (!(await allowed())) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 403 });
  }
  const sources = GLOBAL_PHD_RESEARCH_BATCH.exams.map((exam) => exam.pdfUrl);
  const [imported, published] = await Promise.all([
    prisma.topic.count({ where: { source: { in: sources } } }),
    prisma.topic.count({
      where: { source: { in: sources }, status: "published" },
    }),
  ]);
  return NextResponse.json({
    configured: Boolean((process.env.TINYFISH_API_KEY || "").trim()),
    campaigns: TINYFISH_WORLD_CAMPAIGNS,
    researchBatch: {
      batch: GLOBAL_PHD_RESEARCH_BATCH.report.batch,
      searchedAt: GLOBAL_PHD_RESEARCH_BATCH.report.searchedAt,
      total: GLOBAL_PHD_RESEARCH_BATCH.exams.length,
      imported,
      published,
    },
  });
}

export async function POST(request: Request) {
  if (!(await allowed())) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as {
    campaign?: string;
    researchIndex?: number;
  } | null;

  if (Number.isInteger(body?.researchIndex)) {
    const index = Number(body?.researchIndex);
    const exam = getVerifiedPhdExam(index);
    if (!exam) {
      return NextResponse.json({ error: "عنصر بحث غير صالح." }, { status: 400 });
    }
    try {
      if (!(await isRealPdf(exam.pdfUrl))) {
        return NextResponse.json(
          { error: "تعذر التحقق من ملف PDF الرسمي." },
          { status: 422 },
        );
      }
      const imported = await importVerifiedExam(exam);
      revalidateTag(TOPICS_TAG);
      revalidatePath("/world");
      revalidatePath("/search");
      revalidatePath("/admin/topics");
      return NextResponse.json({
        ok: true,
        index,
        total: GLOBAL_PHD_RESEARCH_BATCH.exams.length,
        exam: {
          title: exam.titleAr,
          university: exam.universityAr,
          year: exam.year,
        },
        imported,
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "فشل استيراد الاختبار.",
        },
        { status: 502 },
      );
    }
  }

  const apiKey = (process.env.TINYFISH_API_KEY || "").trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "TINYFISH_API_KEY غير موجود في Azure." },
      { status: 503 },
    );
  }
  const campaign = getTinyFishCampaign(String(body?.campaign || ""));
  if (!campaign) {
    return NextResponse.json({ error: "دفعة غير صالحة." }, { status: 400 });
  }

  try {
    const results = await tinyFishSearch(
      apiKey,
      campaign.domain,
      campaign.query,
    );
    const candidates = results
      .map((result) => {
        const url = officialPdfUrl(String(result.url || ""), campaign.domain);
        const haystack = `${result.title || ""} ${result.snippet || ""} ${url || ""}`;
        const year = yearFrom(haystack);
        const isSolution =
          /\b(solution|solutions|answer key|answers|corrig[eé])\b/i.test(
            haystack,
          );
        return url && year && !isSolution ? { result, url, year } : null;
      })
      .filter(
        (
          item,
        ): item is { result: SearchResult; url: string; year: number } =>
          Boolean(item),
      );

    const unique = [
      ...new Map(candidates.map((item) => [item.url, item])).values(),
    ].slice(0, 5);
    const imported: unknown[] = [];
    const rejected: unknown[] = [];
    for (const candidate of unique) {
      if (!(await isRealPdf(candidate.url))) {
        rejected.push({ url: candidate.url, reason: "invalid_pdf" });
        continue;
      }
      try {
        imported.push(
          await importExam(
            campaign,
            candidate.result,
            candidate.url,
            candidate.year,
          ),
        );
      } catch (error) {
        rejected.push({
          url: candidate.url,
          reason: error instanceof Error ? error.message : "import_failed",
        });
      }
      if (
        imported.filter(
          (item) =>
            (item as { action?: string }).action === "created",
        ).length >= 3
      ) {
        break;
      }
    }

    revalidateTag(TOPICS_TAG);
    revalidatePath("/world");
    revalidatePath("/search");
    revalidatePath("/admin/topics");
    return NextResponse.json({
      ok: true,
      campaign: campaign.key,
      found: results.length,
      candidates: unique.length,
      imported,
      rejected,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "فشل البحث عبر TinyFish.",
      },
      { status: 502 },
    );
  }
}