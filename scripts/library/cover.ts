// سلسلة الأغلفة بأربع طبقات — لا خانة فارغة أبدًا.
// ملاحظة قانونية: الغلاف عمل فني محمي. لا تنسخ أغلفة من مواقع القرصنة.
// العنوان والمؤلف والسنة وقائع لا تُحمى — ولذلك الغلاف المولّد آمن تمامًا.

import type { CoverKind } from "./types";

export type CoverResult = { coverUrl?: string; coverKind: CoverKind };

/** أقل حجم يقبل كصورة حقيقية — أقل من ذلك أيقونة أو بكسل فارغ */
const MIN_IMAGE_BYTES = 3_000;

/** هل الرابط صورة حقيقية؟ */
export async function isRealImage(url: string): Promise<boolean> {
	try {
		const res = await fetch(url, { method: "HEAD", redirect: "follow" });
		if (!res.ok) return false;

		const type = res.headers.get("content-type") ?? "";
		if (!type.startsWith("image/")) return false;

		const size = Number(res.headers.get("content-length") ?? 0);
		// size === 0 يعني أن الخادم لم يرسل الحجم — نقبل مع النوع الصحيح
		return size === 0 || size >= MIN_IMAGE_BYTES;
	} catch {
		return false;
	}
}

/**
 * غلاف Open Library بـ ISBN.
 *
 * التفصيلة الحرجة: default=false
 * بدونها يُرجع Open Library صورة بكسل فارغة بحالة 200،
 * فتحصل على آلاف مربعات بيضاء وتظن الخلل في كودك.
 * معها يُرجع 404 فننتقل للبديل.
 */
export function openLibraryCover(isbn13: string, size: "S" | "M" | "L" = "L"): string {
	return (
		"https://covers.openlibrary.org/b/isbn/" + isbn13 + "-" + size + ".jpg?default=false"
	);
}

export type ResolveCoverInput = {
	sourceCoverUrl?: string;
	isbn13?: string;
};

/**
 * الطبقات:
 *   1) غلاف الناشر من المصدر (Springer OA · DOAB · OAPEN · MIT)
 *   2) Open Library عبر ISBN
 *   3) الصفحة الأولى من الـ PDF — مرحلة لاحقة (تحتاج pdf render)
 *   4) غلاف مولّد GeneratedCover — دائمًا ينجح
 */
export async function resolveCover(input: ResolveCoverInput): Promise<CoverResult> {
	if (input.sourceCoverUrl && (await isRealImage(input.sourceCoverUrl))) {
		return { coverUrl: input.sourceCoverUrl, coverKind: "publisher" };
	}

	if (input.isbn13) {
		const url = openLibraryCover(input.isbn13);
		if (await isRealImage(url)) return { coverUrl: url, coverKind: "openlibrary" };
	}

	// الطبقة الرابعة: لا رابط — الواجهة ترسم GeneratedCover من العنوان والمفتاح
	return { coverKind: "generated" };
}
