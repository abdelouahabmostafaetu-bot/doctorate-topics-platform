// طبقة اختيار التخزين لملفات المحاضرات:
//   إن كانت إعدادات Azure موجودة  → Azure Blob (رصيد Azure for Students)
//   وإلّا                          → Cloudflare R2 (السلوك القديم)
//
// الملفات القديمة المرفوعة على R2 تبقى تعمل كما هي — الحذف يتعرّف على مصدر
// كل رابط تلقائيًا.

import {
	getPresignedUploadUrl,
	publicUrlForKey,
	deleteFile as deleteR2File,
} from "@/lib/storage";
import {
	isAzureConfigured,
	isAzureUrl,
	getAzureUploadUrl,
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

/** يحذف ملف محاضرة من مزوّده الصحيح (Azure أو R2) حسب الرابط. */
export async function deleteLectureFile(url: string): Promise<void> {
	if (!url) return;
	if (isAzureUrl(url)) {
		await azureDeleteFile(url);
		return;
	}
	await deleteR2File(url);
}
