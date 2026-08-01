// أدوات مشتركة لاستيراد كتب الرياضيات: الفلترة الموضوعية، التصنيف، الرخص، مفاتيح التكرار.
// قائمة الأبواب نفسها في taxonomy.ts (مبنية على MSC 2020).

import { FALLBACK_CATEGORY, TAXONOMY } from "./taxonomy";

export type BookSource = "gutenberg" | "openalex";

export type NormalizedBook = {
	source: BookSource;
	sourceId: string;
	title: string;
	author: string;
	summary: string;
	coverUrl: string;
	downloadUrl: string;
	fileMime: string;
	category: string;
	license: string;
	language: string;
	year: number | null;
};

export { FALLBACK_CATEGORY };

// مصطلحات تثبت أن العمل رياضي حتى لو لم يطابق بابًا بعينه
const BASE_MATH_TERMS = [
	"mathematic", "mathematik", "mathematique", "mathematical", "arithmetic", "theorem", "equation",
];

function haystack(terms: string[]): string {
	return terms.filter(Boolean).join(" | ").toLowerCase();
}

/**
 * يعيد الباب المناسب انطلاقًا من المواضيع والعنوان.
 *
 * لا نكتفي بأول قاعدة تطابق، بل نحسب نقاطًا: العبارة المركّبة ثلاث نقاط
 * والكلمة المفردة نقطتان. فـ "functional analysis" يغلب "analysis" دائمًا.
 * والمقارنة صارمة ليفوز الباب الأخص عند التعادل.
 */
export function detectCategory(terms: string[]): string {
	const hay = haystack(terms);
	let best = FALLBACK_CATEGORY;
	let bestScore = 0;

	for (const category of TAXONOMY) {
		let score = 0;
		for (const keyword of category.keywords) {
			if (!hay.includes(keyword)) continue;
			score += keyword.includes(" ") ? 3 : 2;
		}
		if (score > bestScore) {
			bestScore = score;
			best = category.name;
		}
	}

	return bestScore > 0 ? best : FALLBACK_CATEGORY;
}

/** فلتر الرياضيات — يمنع دخول الضجيج إلى المكتبة */
export function isMathematics(terms: string[]): boolean {
	const hay = haystack(terms);
	if (BASE_MATH_TERMS.some((k) => hay.includes(k))) return true;
	return TAXONOMY.some((c) => c.keywords.some((k) => hay.includes(k)));
}

// رخص تسمح بإعادة التوزيع (أي: يجوز استضافة الملف عندنا)
const OPEN_LICENSES = ["public domain", "publicdomain", "pd", "cc0", "cc-by", "cc-by-sa", "cc-by-nd", "cc-by-nc", "cc-by-nc-sa", "cc-by-nc-nd"];

/** هل يجوز استضافة الملف؟ إن كانت الإجابة لا، نكتفي بالرابط الخارجي. */
export function isRedistributable(license: string): boolean {
	const value = (license || "").trim().toLowerCase();
	if (!value) return false;
	return OPEN_LICENSES.some((k) => value === k || value.startsWith(k));
}

/** تطبيع نص لبناء مفتاح مقارنة ثابت */
export function normalizeKeyPart(input: string): string {
	return (input || "")
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

/** مفتاح إزالة التكرار: العنوان + المؤلف بعد التطبيع */
export function dedupeKey(title: string, author: string): string {
	return normalizeKeyPart(title) + "::" + normalizeKeyPart(author);
}

export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function clean(input: string, max: number): string {
	return (input || "").replace(/\s+/g, " ").trim().slice(0, max);
}
