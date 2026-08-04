// تحديد حالة الوصول والتحقق من ملفات PDF.
// القاعدة: لا يوجد حقل تحميل إلا إذا كان الملف مفتوحًا ومحقّقًا فعلًا.

import type { Access, RawItem } from "./types";

/** مصادر يجوز منها تقديم رابط تحميل مباشر (مفتوحة ومرخّصة) */
export const OPEN_SOURCES = new Set([
	"springer-oa",
	"doab",
	"oapen",
	"hal",
	"numdam",
	"eudml",
	"libretexts",
	"openstax",
	"aim",
	"mitpress-oa",
	"ems-oa",
	"stacks",
	"openlogic",
]);

/** رخص تسمح بالتوزيع — ترفع السجل إلى open حتى من مصدر مختلط */
const OPEN_LICENSE = /creativecommons|\bcc[\s-]?(by|zero|0)\b|public\s*domain|\bopen\s*access\b/i;

/**
 * ثلاث حالات فقط:
 * - open          : رابط PDF مفتوح من مصدر مرخّص → زر تحميل
 * - external      : ملف مفتوح لكن من مصدر لا نوزّع عنه → «اقرأ عند الناشر»
 * - metadata-only : لا ملف → رابط رسمي فقط، ولا يُرسل حقل تحميل مطلقًا
 */
export function resolveAccess(raw: RawItem): Access {
	if (!raw.pdfUrl) return "metadata-only";

	const licensed = raw.license ? OPEN_LICENSE.test(raw.license) : false;
	if (OPEN_SOURCES.has(raw.source) || licensed) return "open";

	return "external";
}

export type PdfCheck = {
	pdfStatus: "ok" | "dead";
	pdfSize?: number;
	pdfCheckedAt: Date;
};

/** أقل حجم معقول لكتاب — أقل من هذا عادةً صفحة خطأ أو إعادة توجيه */
const MIN_PDF_BYTES = 50_000;

/**
 * تحقق بـ HEAD. لا تقدم زر تحميل دون هذا:
 * بعد ستة أشهر يموت نحو 20% من الروابط، وطالب يضغط زرًا معطلًا لا يعود.
 */
export async function verifyPdf(url: string): Promise<PdfCheck> {
	const now = new Date();
	try {
		const res = await fetch(url, { method: "HEAD", redirect: "follow" });
		const type = res.headers.get("content-type") ?? "";
		const size = Number(res.headers.get("content-length") ?? 0);

		// بعض الخوادم لا ترسل content-length — نقبل إن كان النوع صحيحًا
		const sizeOk = size === 0 || size >= MIN_PDF_BYTES;
		const typeOk = type.includes("pdf") || type.includes("octet-stream");
		const ok = res.ok && typeOk && sizeOk;

		return { pdfStatus: ok ? "ok" : "dead", pdfSize: size || undefined, pdfCheckedAt: now };
	} catch {
		return { pdfStatus: "dead", pdfCheckedAt: now };
	}
}

/** طلب نسخة من المؤلف — تصرف مشروع ومحترم للكتب المغلقة */
export function requestCopyUrl(doi?: string): string | undefined {
	if (!doi) return undefined;
	return `https://openaccessbutton.org/${encodeURIComponent(doi)}`;
}

/** مفيد للتشخيص: يجب أن تكون النتيجة دائمًا خالية من downloadUrl للمغلقة */
export function assertNoLeak(access: Access, pdfUrl?: string): void {
	if (access === "metadata-only" && pdfUrl) {
		throw new Error("تسرّب: سجل metadata-only يحمل رابط PDF");
	}
}
