import {
	BlobServiceClient,
	StorageSharedKeyCredential,
	BlobSASPermissions,
	generateBlobSASQueryParameters,
	SASProtocol,
} from "@azure/storage-blob";
import { attachmentDisposition } from "@/lib/content-disposition";

// تخزين ملفات المحاضرات على Azure Blob Storage (رصيد Azure for Students).
// باقي الموقع (المواضيع، المكتبة، الصور الشخصية...) يبقى على Cloudflare R2
// عبر src/lib/storage.ts
//
// المتغيرات المطلوبة في .env و Vercel:
//   AZURE_STORAGE_ACCOUNT   اسم حساب التخزين، مثال: doctoratelectures
//   AZURE_STORAGE_KEY       مفتاح الوصول (Access keys → key1)
//   AZURE_STORAGE_CONTAINER اسم الحاوية، مثال: lectures

const BLOB_HOST_SUFFIX = ".blob.core.windows.net";

function accountName(): string {
	return process.env.AZURE_STORAGE_ACCOUNT ?? "";
}

function accountKey(): string {
	return process.env.AZURE_STORAGE_KEY ?? "";
}

function containerName(): string {
	return process.env.AZURE_STORAGE_CONTAINER || "lectures";
}

/** أصل حساب التخزين، مثال: https + "://doctoratelectures.blob.core.windows.net" */
function accountOrigin(): string {
	return "https" + "://" + accountName() + BLOB_HOST_SUFFIX;
}

/** هل إعدادات Azure مكتملة؟ إن لم تكن، يرجع الكود تلقائيًا إلى R2. */
export function isAzureConfigured(): boolean {
	return Boolean(accountName() && accountKey());
}

function assertConfigured() {
	if (!isAzureConfigured()) {
		throw new Error(
			"إعدادات Azure (AZURE_STORAGE_ACCOUNT / AZURE_STORAGE_KEY) ناقصة في .env",
		);
	}
}

function credential(): StorageSharedKeyCredential {
	return new StorageSharedKeyCredential(accountName(), accountKey());
}

/** الرابط الأساسي للحاوية. */
export function azurePublicBase(): string {
	return accountOrigin() + "/" + containerName();
}

/** الرابط العام لمفتاح ملف معيّن. */
export function azurePublicUrlForKey(key: string): string {
	return azurePublicBase() + "/" + key;
}

/** هل هذا الرابط يخص تخزين Azure الخاص بنا؟ */
export function isAzureUrl(url: string): boolean {
	if (!accountName()) return false;
	return url.startsWith(accountOrigin() + "/");
}

/** مفتاح الملف من رابطه العام (مفكوك الترميز). */
export function azureKeyFromUrl(url: string): string | null {
	const base = azurePublicBase() + "/";
	if (!url.startsWith(base)) return null;
	try {
		return decodeURIComponent(url.slice(base.length).split("?")[0]);
	} catch {
		return url.slice(base.length).split("?")[0];
	}
}

/**
 * ينشئ رابط رفع مباشر (SAS PUT) صالحًا لمدة 30 دقيقة.
 * يسمح للمتصفح برفع الملف مباشرة إلى Azure دون المرور بحد حجم الطلب في Vercel.
 */
export async function getAzureUploadUrl(
	key: string,
	_contentType: string,
): Promise<string> {
	assertConfigured();
	const startsOn = new Date(Date.now() - 5 * 60 * 1000); // هامش لفروق الساعة
	const expiresOn = new Date(Date.now() + 30 * 60 * 1000);
	const sas = generateBlobSASQueryParameters(
		{
			containerName: containerName(),
			blobName: key,
			permissions: BlobSASPermissions.parse("cw"),
			startsOn,
			expiresOn,
			protocol: SASProtocol.Https,
		},
		credential(),
	).toString();
	return azurePublicUrlForKey(key) + "?" + sas;
}

/**
 * رابط تحميل مباشر (SAS قراءة) يفرض التنزيل بدل العرض داخل المتصفح
 * عبر تجاوز ترويسة Content-Disposition للملف (rscd). صالح لساعة.
 */
export async function getAzureDownloadUrl(
	url: string,
	fileName: string,
): Promise<string> {
	if (!isAzureConfigured()) return url;
	const key = azureKeyFromUrl(url);
	if (!key) return url;
	const sas = generateBlobSASQueryParameters(
		{
			containerName: containerName(),
			blobName: key,
			permissions: BlobSASPermissions.parse("r"),
			startsOn: new Date(Date.now() - 5 * 60 * 1000),
			expiresOn: new Date(Date.now() + 60 * 60 * 1000),
			protocol: SASProtocol.Https,
			contentDisposition: attachmentDisposition(fileName),
		},
		credential(),
	).toString();
	return url.split("?")[0] + "?" + sas;
}

/** رفع ملف من السيرفر مباشرة (الرفع الأساسي يتم من المتصفح). */
export async function azureUploadFile(
	buffer: Buffer,
	key: string,
	contentType: string,
): Promise<string> {
	assertConfigured();
	const service = new BlobServiceClient(accountOrigin(), credential());
	const container = service.getContainerClient(containerName());
	await container.createIfNotExists({ access: "blob" });
	await container
		.getBlockBlobClient(key)
		.uploadData(buffer, { blobHTTPHeaders: { blobContentType: contentType } });
	return azurePublicUrlForKey(key);
}

/** حذف ملف من Azure برابطه العام. يتجاهل الأخطاء بهدوء. */
export async function azureDeleteFile(url: string): Promise<void> {
	try {
		if (!isAzureUrl(url)) return;
		const key = azureKeyFromUrl(url);
		if (!key) return;
		const service = new BlobServiceClient(accountOrigin(), credential());
		await service
			.getContainerClient(containerName())
			.getBlockBlobClient(key)
			.deleteIfExists();
	} catch (err) {
		console.error("تعذّر حذف الملف من Azure:", err);
	}
}
