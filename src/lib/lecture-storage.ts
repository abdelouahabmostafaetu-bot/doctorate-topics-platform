// طبقة اختيار التخزين لملفات المحاضرات:
//   إن كانت إعدادات Azure موجودة  → Azure Blob (رصيد Azure for Students)
//   وإلّا                          → Cloudflare R2 (السلوك القديم)
//
// الملفات القديمة المرفوعة على R2 تبقى تعمل كما هي — الحذف والتحميل يتعرّفان
// على مصدر كل رابط تلقائيًا.

import {
	getPresignedUploadUrl,
	getPresignedDownloadUrl,
	publicUrlForKey,
	deleteFile as deleteR2File,
} from "@/lib/storage";
import {
	isAzureConfigured,
	isAzureUrl,
	getAzureUploadUrl,
	getAzureDownloadUrl,
	azurePublicUrlForKey,
	azureDeleteFile,
} from "@/lib/azure-storage";

export type LectureUploadTarget = {
	/** رابط الرفع المباشر (PUT من المتصفح). */
	uploadUrl: string;
	/** الرابط العام النهائي الذي يُحفظ في قاعدة البيانات. */
	url: string;
	/** مزوّد التخزين المستخدم — للعرض/التشخيص فقط. */
	provider: "azure" | "r2";
};

/** يجهّز رابط رفع لملف محاضرة على المزوّد المناسب. */
export async function getLectureUploadTarget(
	key: string,
	contentType: string,
): Promise<LectureUploadTarget> {
	if (isAzureConfigured()) {
		return {
			uploadUrl: await getAzureUploadUrl(key, contentType),
			url: azurePublicUrlForKey(key),
			provider: "azure",
		};
	}
	return {
		uploadUrl: await getPresignedUploadUrl(key, contentType),
		url: publicUrlForKey(key),
		provider: "r2",
	};
}

/**
 * رابط تحميل مباشر يفرض التنزيل (لا يُفتح الملف داخل المتصفح)،
 * من المزوّد الصحيح حسب الرابط. يعود للرابط الأصلي عند أي خطأ.
 */
export async function getLectureDownloadUrl(
	url: string,
	fileName: string,
): Promise<string> {
	if (!url) return url;
	try {
		if (isAzureUrl(url)) return await getAzureDownloadUrl(url, fileName);
		return await getPresignedDownloadUrl(url, fileName);
	} catch {
		return url;
	}
}

/** يحذف ملف محاضرة من مزوّده الصحيح (Azure أو R2) حسب الرابط. */
export async function deleteLectureFile(url: string): Promise<void> {
	if (!url) return;
	if (isAzureUrl(url)) {
		await azureDeleteFile(url);
		return;
	}
	await deleteR2File(url);
}
