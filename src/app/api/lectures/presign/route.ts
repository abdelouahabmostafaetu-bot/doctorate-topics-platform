import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPresignedUploadUrl, publicUrlForKey } from "@/lib/storage";

export const runtime = "nodejs";

// رفع ملفات المحاضرات — للمشرفين فقط. الرفع يتم مباشرة من المتصفح إلى R2
// عبر presigned URL، فلا يخضع لحد حجم الطلب في Vercel (~4.5 م.ب).
const MAX_BYTES = 200 * 1024 * 1024; // 200 م.ب — يسمح بملفات ZIP كبيرة

export async function POST(request: Request) {
	const session = await auth();
	const role = session?.user?.role;
	if (!session?.user?.id || (role !== "ADMIN" && role !== "SUPER_ADMIN")) {
		return NextResponse.json(
			{ error: "رفع ملفات المحاضرات متاح للمشرفين فقط." },
			{ status: 403 },
		);
	}

	let body: { fileName?: string; contentType?: string; sizeBytes?: number };
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
	}

	const name = String(body.fileName || "file");
	const contentType = String(body.contentType || "application/octet-stream");
	const sizeBytes = Number(body.sizeBytes) || 0;

	if (sizeBytes <= 0) {
		return NextResponse.json({ error: "حجم الملف غير صالح." }, { status: 400 });
	}
	if (sizeBytes > MAX_BYTES) {
		return NextResponse.json(
			{ error: "حجم الملف يتجاوز 200 م.ب." },
			{ status: 400 },
		);
	}

	const dot = name.lastIndexOf(".");
	const ext = dot >= 0 ? name.slice(dot).toLowerCase() : "";
	const base = dot >= 0 ? name.slice(0, dot) : name;
	const safeBase =
		base.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 60) || "file";
	const key = "lectures/" + Date.now() + "-" + safeBase + ext;

	const uploadUrl = await getPresignedUploadUrl(key, contentType);
	return NextResponse.json({
		uploadUrl,
		url: publicUrlForKey(key),
		fileName: name,
	});
}
