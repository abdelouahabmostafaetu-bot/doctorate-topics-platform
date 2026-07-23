import { NextRequest, NextResponse } from "next/server";

// وسيط شعارات الجامعات:
// يحمّل الخادم صورة الشعار من المصدر الخارجي ثم يقدّمها من نطاقنا نحن.
// هذا يحل نهائيًا مشاكل منع التضمين (Hotlink) وحجب المتصفح للصور الخارجية.

export const runtime = "nodejs";

const MAX_BYTES = 3 * 1024 * 1024; // 3MB حد أقصى للشعار

export async function GET(req: NextRequest) {
	const u = req.nextUrl.searchParams.get("u") || "";
	if (!/^https?:\/\//i.test(u)) {
		return new NextResponse("Bad url", { status: 400 });
	}

	try {
		const res = await fetch(u, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
				Accept: "image/avif,image/webp,image/png,image/svg+xml,image/*;q=0.8,*/*;q=0.5",
			},
			redirect: "follow",
			cache: "no-store",
		});
		if (!res.ok) return new NextResponse("Fetch failed", { status: 502 });

		const type = (res.headers.get("content-type") || "").split(";")[0].trim();
		if (!type.startsWith("image/")) {
			return new NextResponse("Not an image", { status: 415 });
		}

		const buf = await res.arrayBuffer();
		if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) {
			return new NextResponse("Invalid size", { status: 413 });
		}

		return new NextResponse(buf, {
			headers: {
				"Content-Type": type,
				// كاش طويل: الشعارات لا تتغير كثيرًا
				"Cache-Control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800",
			},
		});
	} catch {
		return new NextResponse("Fetch error", { status: 502 });
	}
}
