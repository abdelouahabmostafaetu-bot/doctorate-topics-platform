import { NextResponse, type NextRequest } from "next/server";
import { getUniversityExamSource } from "@/data/university-exams";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function findOfficialAsset(request: NextRequest) {
  const source = getUniversityExamSource(
    request.nextUrl.searchParams.get("source") || "",
  );
  const collection = source?.collections.find(
    (item) =>
      item.id === request.nextUrl.searchParams.get("collection"),
  );
  const assetIndex = Number.parseInt(
    request.nextUrl.searchParams.get("asset") || "",
    10,
  );
  const asset =
    Number.isInteger(assetIndex) && assetIndex >= 0
      ? collection?.assets?.[assetIndex]
      : null;
  return { source, collection, asset };
}

export async function GET(request: NextRequest) {
  const { asset } = findOfficialAsset(request);
  if (!asset) {
    return NextResponse.json(
      { error: "ملف الاختبار غير موجود." },
      { status: 404 },
    );
  }

  const range = request.headers.get("range");
  let upstream: Response;
  try {
    upstream = await fetch(asset.url, {
      redirect: "follow",
      cache: "no-store",
      headers: {
        Accept: "application/pdf,*/*",
        "User-Agent": "DocMathDZ-University-Exam-Reader/1.0",
        ...(range ? { Range: range } : {}),
      },
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    return NextResponse.json(
      { error: "تعذر الاتصال بمصدر الملف الرسمي." },
      { status: 502 },
    );
  }

  const contentType = upstream.headers.get("content-type") || "";
  if (
    !upstream.ok ||
    !upstream.body ||
    /text\/html|application\/xhtml/i.test(contentType)
  ) {
    return NextResponse.json(
      { error: "المصدر الرسمي لم يُرجع ملف PDF." },
      { status: 502 },
    );
  }

  const headers = new Headers({
    "Content-Type": /application\/pdf/i.test(contentType)
      ? contentType
      : "application/pdf",
    "Content-Disposition": `inline; filename="university-exam-${asset.year}.pdf"`,
    "Cache-Control": "private, max-age=3600",
    "Accept-Ranges": upstream.headers.get("accept-ranges") || "bytes",
    "X-Content-Type-Options": "nosniff",
  });
  for (const name of [
    "content-length",
    "content-range",
    "etag",
    "last-modified",
  ]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  return new NextResponse(upstream.body as unknown as BodyInit, {
    status: upstream.status,
    headers,
  });
}