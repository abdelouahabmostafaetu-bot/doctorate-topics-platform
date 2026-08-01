// أدوات مشتركة لاستيراد كتب الرياضيات: البوابة الموضوعية، الرخص، مفاتيح التكرار.
// محرّك التصنيف نفسه في classify.ts ، وقائمة الأبواب في taxonomy.ts (مبنية على MSC 2020).

import { classifyFields, normalizeText } from "./classify";
import { DENY_TERMS, FALLBACK_CATEGORY, STRONG_TERMS, WEAK_TERMS } from "./taxonomy";

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

/**
 * تصنيف من قائمة مصطلحات مسطّحة (توافق خلفي لمحوّلات لا تفصل الحقول).
 * المحوّلات التي تميّز الموضوع من العنوان ينبغي أن تنادي classifyFields مباشرة.
 */
export function detectCategory(terms: string[]): string {
	return classifyFields({ title: "", subjects: terms, summary: "" }).category;
}

/** مطابقة بحدود الكلمات على نص مطبّع */
function has(paddedHay: string, term: string): boolean {
	const needle = normalizeText(term);
	if (!needle) return false;
	return paddedHay.includes(" " + needle + " ") || paddedHay.includes(" " + needle + "s ");
}

/**
 * البوابة: هل هذا الكتاب رياضيات حقًا؟ الأدلة مدرّجة لا متساوية:
 *
 *   دليل قاطع (topology ، logarithm)  ←  يدخل حتى مع موضوع مستبعد
 *   موضوع مستبعد (nursing)         ←  يُرفض
 *   دليل ضعيف (mathematics وحدها)     ←  يدخل
 *
 * الترتيب جوهري: فحص المستبعد قبل الدليل الضعيف وبعد القاطع.
 */
export function isMathematics(terms: string[]): boolean {
	const hay = " " + normalizeText(terms.filter(Boolean).join(" | ")) + " ";
	if (STRONG_TERMS.some((k) => has(hay, k))) return true;
	if (DENY_TERMS.some((k) => has(hay, k))) return false;
	return WEAK_TERMS.some((k) => has(hay, k));
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
