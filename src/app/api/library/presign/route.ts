import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPresignedUploadUrl, publicUrlForKey } from "@/lib/storage";

export const runtime = "nodejs";

// رفع ملفات المكتبة (غلاف أو كتاب) — للأدمين فقط، مباشرة من المتصفح إلى R2
const MAX_BYTES = 200 * 1024 * 1024; // 200 م.ب

export async function POST(request: Request) {
	const session = await auth();
	const role = session?.user?.role;
	if (!session?.user?.id || (role !== "ADMIN" && role !== "SUPER_ADMIN")) {
		return NextResponse.json({ error: "Admins only." }, { status: 403 });
	}

	let body: {
		fileName?: string;
		contentType?: string;
		sizeBytes?: number;
		kind?: string;
	};
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid request." }, { status: 400 });
	}

	const name = String(body.fileName || "file");
	const contentType = String(body.contentType || "application/octet-stream");
	const sizeBytes = Number(body.sizeBytes) || 0;
	const kind = body.kind === "cover" ? "covers" : "books";

	if (sizeBytes <= 0) {
		return NextResponse.json({ error: "Invalid file size." }, { status: 400 });
	}
	if (sizeBytes > MAX_BYTES) {
		return NextResponse.json(
			{ error: "File exceeds the 200 MB limit." },
			{ status: 400 },
		);
	}

	const dot = name.lastIndexOf(".");
	const ext = dot >= 0 ? name.slice(dot).toLowerCase() : "";
	const base = dot >= 0 ? name.slice(0, dot) : name;
	const safeBase = base.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 60) || "file";
	const key = `library/${kind}/${Date.now()}-${safeBase}${ext}`;

	const uploadUrl = await getPresignedUploadUrl(key, contentType);
	return NextResponse.json({
		uploadUrl,
		url: publicUrlForKey(key),
		fileName: name,
	});
}
