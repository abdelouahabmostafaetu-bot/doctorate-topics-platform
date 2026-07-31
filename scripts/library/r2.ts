// رفع نسخة من الملف إلى التخزين (R2) حتى يعمل زر التحميل دائمًا ولو تعطّل المصدر.
// يستعمل نفس متغيرات البيئة المستعملة في src/lib/storage.ts.

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const MAX_BYTES = 60 * 1024 * 1024; // 60MB — حماية من الملفات الضخمة

export function storageConfigured(): boolean {
	return Boolean(
		process.env.STORAGE_ENDPOINT &&
			process.env.STORAGE_ACCESS_KEY &&
			process.env.STORAGE_SECRET_KEY &&
			process.env.STORAGE_BUCKET,
	);
}

function client(): S3Client {
	return new S3Client({
		region: "auto",
		endpoint: process.env.STORAGE_ENDPOINT,
		forcePathStyle: true,
		credentials: {
			accessKeyId: process.env.STORAGE_ACCESS_KEY || "",
			secretAccessKey: process.env.STORAGE_SECRET_KEY || "",
		},
	});
}

function publicUrl(key: string): string {
	const base = (process.env.STORAGE_PUBLIC_URL_BASE || "").replace(/\/$/, "");
	if (base) return base + "/" + key;
	return process.env.STORAGE_ENDPOINT + "/" + process.env.STORAGE_BUCKET + "/" + key;
}

export function extensionFor(mime: string): string {
	if (mime.includes("pdf")) return ".pdf";
	if (mime.includes("epub")) return ".epub";
	if (mime.includes("mobipocket")) return ".mobi";
	if (mime.includes("html")) return ".html";
	if (mime.includes("plain")) return ".txt";
	if (mime.includes("jpeg")) return ".jpg";
	return "";
}

/** ينزّل الملف من مصدره ويرفعه إلى R2، ويعيد الرابط العام (أو null عند الفشل) */
export async function mirrorToR2(sourceUrl: string, key: string, mime: string): Promise<string | null> {
	try {
		const response = await fetch(sourceUrl);
		if (!response.ok) return null;

		const buffer = Buffer.from(await response.arrayBuffer());
		if (buffer.byteLength === 0 || buffer.byteLength > MAX_BYTES) return null;

		await client().send(
			new PutObjectCommand({
				Bucket: process.env.STORAGE_BUCKET as string,
				Key: key,
				Body: buffer,
				ContentType: response.headers.get("content-type") || mime,
			}),
		);
		return publicUrl(key);
	} catch (error) {
		console.error("  ↳ تعذّر رفع الملف:", (error as Error).message);
		return null;
	}
}
