const SOURCE_URL =
  "https://uwaterloo.ca/pure-mathematics/sites/default/files/uploads/documents/2025-a-fields-galois.pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const range = request.headers.get("range");
  const upstream = await fetch(SOURCE_URL, {
    headers: {
      ...(range ? { Range: range } : {}),
      "User-Agent":
        "Mozilla/5.0 (compatible; DocMathDZ/1.0; +https://www.docmathdz.dev)",
      Accept: "application/pdf,*/*",
    },
    cache: "no-store",
  });

  if (!upstream.ok && upstream.status !== 206) {
    return new Response("تعذر تحميل ملف الامتحان", { status: 502 });
  }

  const headers = new Headers();
  headers.set("Content-Type", "application/pdf");
  headers.set("Content-Disposition", 'inline; filename="waterloo-fields-galois-qualifying-exam-2025.pdf"');
  headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400");
  headers.set("Accept-Ranges", upstream.headers.get("accept-ranges") || "bytes");

  for (const name of ["content-length", "content-range", "etag", "last-modified"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  return new Response(upstream.body, { status: upstream.status, headers });
}
