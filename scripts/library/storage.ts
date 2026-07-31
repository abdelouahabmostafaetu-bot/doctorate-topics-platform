// تخزين ملفات الكتب المستوردة.
//
// الأولوية لـ Azure Blob Storage (رصيد Azure for Students — 100 جيغا)،
// وإن لم تكن إعداداته مكتملة يرجع تلقائيًا إلى R2. نفس اصطلاح
// src/lib/azure-storage.ts تمامًا حتى تبقى الروابط متوافقة مع بقية الموقع.
//
// المتغيرات:
//   AZURE_STORAGE_ACCOUNT     اسم حساب التخزين
//   AZURE_STORAGE_KEY         مفتاح الوصول (Access keys → key1)
//   AZURE_LIBRARY_CONTAINER   حاوية الكتب (افتراضيًا "library")

import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

// رصيد Azure يسمح بملفات أكبر بكثير مما يلزم الكتب
const MAX_BYTES = 200 * 1024 * 1024;

const BLOB_HOST_SUFFIX = ".blob.core.windows.net";

// —— Azure ——

function azureAccount(): string {
	return process.env.AZURE_STORAGE_ACCOUNT ?? "";
}

function azureKey(): string {
	return process.env.AZURE_STORAGE_KEY ?? "";
}

function azureContainer(): string {
	// حاوية مستقلة للكتب حتى لا تختلط بملفات المحاضرات
	return process.env.AZURE_LIBRARY_CONTAINER || "library";
}

function azureOrigin(): string {
	return "https" + "://" + azureAccount() + BLOB_HOST_SUFFIX;
}

export function azureConfigured(): boolean {
	return Boolean(azureAccount() && azureKey());
}

async function uploadToAzure(buffer: Buffer, key: string, contentType: string): Promise<string> {
	const credential = new StorageSharedKeyCredential(azureAccount(), azureKey());
	const service = new BlobServiceClient(azureOrigin(), credential);
	const container = service.getContainerClient(azureContainer());
	// access: "blob" يجعل القراءة عامة للملفات دون سرد محتويات الحاوية
	await container.createIfNotExists({ access: "blob" });
	await container
		.getBlockBlobClient(key)
		.uploadData(buffer, { blobHTTPHeaders: { blobContentType: contentType } });
	return azureOrigin() + "/" + azureContainer() + "/" + key;
}

// —— R2 / S3 (احتياطي) ——

export function r2Configured(): boolean {
	return Boolean(
		process.env.STORAGE_ENDPOINT &&
			process.env.STORAGE_ACCESS_KEY &&
			process.env.STORAGE_SECRET_KEY &&
			process.env.STORAGE_BUCKET,
	);
}

async function uploadToR2(buffer: Buffer, key: string, contentType: string): Promise<string> {
	const client = new S3Client({
		region: "auto",
		endpoint: process.env.STORAGE_ENDPOINT,
		forcePathStyle: true,
		credentials: {
			accessKeyId: process.env.STORAGE_ACCESS_KEY || "",
			secretAccessKey: process.env.STORAGE_SECRET_KEY || "",
		},
	});
	await client.send(
		new PutObjectCommand({
			Bucket: process.env.STORAGE_BUCKET as string,
			Key: key,
			Body: buffer,
			ContentType: contentType,
		}),
	);
	const base = (process.env.STORAGE_PUBLIC_URL_BASE || "").replace(/\/$/, "");
	if (base) return base + "/" + key;
	return process.env.STORAGE_ENDPOINT + "/" + process.env.STORAGE_BUCKET + "/" + key;
}

// —— الواجهة الموحّدة ——

export function storageConfigured(): boolean {
	return azureConfigured() || r2Configured();
}

/** اسم التخزين المستعمل فعليًا — للطباعة في السجل */
export function storageName(): string {
	if (azureConfigured()) return "Azure Blob (" + azureAccount() + "/" + azureContainer() + ")";
	if (r2Configured()) return "Cloudflare R2";
	return "غير مضبوط";
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

/**
 * ينزّل الملف من مصدره ويرفعه إلى التخزين، ويعيد الرابط العام.
 * يعيد null عند أي فشل — وعندها يُحفظ الرابط الخارجي كما هو.
 */
export async function mirrorToStorage(sourceUrl: string, key: string, mime: string): Promise<string | null> {
	try {
		const response = await fetch(sourceUrl);
		if (!response.ok) return null;

		const buffer = Buffer.from(await response.arrayBuffer());
		if (buffer.byteLength === 0 || buffer.byteLength > MAX_BYTES) return null;

		const contentType = response.headers.get("content-type") || mime;
		if (azureConfigured()) return await uploadToAzure(buffer, key, contentType);
		if (r2Configured()) return await uploadToR2(buffer, key, contentType);
		return null;
	} catch (error) {
		console.error("  ↳ تعذّر رفع الملف:", (error as Error).message);
		return null;
	}
}
