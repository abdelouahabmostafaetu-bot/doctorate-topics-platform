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
  const existing = await prisma.topic.findFirst({
    where: { source: url },
    select: { id: true, slug: true },
  });
  if (existing) return { action: "existing", slug: existing.slug, url };

  const [university, specialty] = await Promise.all([
    ensureUniversity({
      name: `${campaign.countryCode} - ${campaign.university}`,
      nameAr: campaign.universityAr,
    }),
    ensureSpecialty({ name: "Mathematics", nameAr: "الرياضيات" }),
  ]);
  const examNumber =
    (await prisma.topic.count({
      where: {
        universityId: university.id,
        specialtyId: specialty.id,
        year,
      },
    })) + 1;
  const slug = await uniqueTopicSlug(
    `${campaign.countryCode}-${campaign.university}-${year}-tinyfish-${examNumber}`,
  );
  const title =
    String(result.title || "").replace(/\s+/g, " ").trim().slice(0, 180) ||
    `اختبار دكتوراه الرياضيات ${year} — ${campaign.universityAr}`;
  const topic = await prisma.topic.create({
    data: {
      legacyId: await allocateManualLegacyId(),
      slug,
      title,
      examType: "specialty",
      year,
      examNumber,
      durationMinutes: 180,
      universityId: university.id,
      specialtyId: specialty.id,
      source: url,
      problems: [],
      files: [],
      // لا ننشره في /world قبل نجاح تجهيز القارئ نفسه المستعمل في صفحة الموضوع.
      status: "draft",
    },
  });

  try {
    const fileName =
      new URL(url).pathname.split("/").pop()?.slice(0, 120) ||
      `exam-${year}.pdf`;
    const copied = await copyExamPdfFromUrl(
      url,
      `exams/topics/${topic.id}/exam_pdf-${Date.now()}-${fileName}`,
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
      return { action: "created", slug, url, readerPages };
    }
    return {
      action: "draft_reader_failed",
      slug,
      url,
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
  return NextResponse.json({
    configured: Boolean((process.env.TINYFISH_API_KEY || "").trim()),
    campaigns: TINYFISH_WORLD_CAMPAIGNS,
  });
}

export async function POST(request: Request) {
  if (!(await allowed())) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 403 });
  }
  const apiKey = (process.env.TINYFISH_API_KEY || "").trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "TINYFISH_API_KEY غير موجود في Azure." },
      { status: 503 },
    );
  }
  const body = (await request.json().catch(() => null)) as {
    campaign?: string;
  } | null;
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