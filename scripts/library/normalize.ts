// أدوات مشتركة لاستيراد كتب الرياضيات: الفلترة الموضوعية، التصنيف، الرخص، مفاتيح التكرار.
// لا تعتمد على أي مصدر بعينه — كل المحوّلات تُخرج NormalizedBook.

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

/** التصنيف الافتراضي عندما لا تطابق أي قاعدة */
export const FALLBACK_CATEGORY = "General Mathematics";

// ترتيب القواعد مهم: الأخص أولًا (نظرية الأعداد قبل الجبر مثلًا)
const CATEGORY_RULES: Array<[string, string[]]> = [
	["Number Theory", ["number theory", "prime number", "diophantine", "arithmetic function", "theorie des nombres"]],
	["Logic & Set Theory", ["logic", "set theory", "foundations of mathematics", "computability", "godel", "recursive function"]],
	["Topology", ["topology", "topologie", "manifold", "homology", "homotopy", "knot theory"]],
	["Differential Equations", ["differential equation", "partial differential", "dynamical system", "equations differentielles"]],
	["Probability & Statistics", ["probability", "probabilit", "statistic", "stochastic", "random variable", "bayes", "markov"]],
	["Analysis", ["analysis", "analyse", "calculus", "integral", "fourier", "measure theory", "functional analysis", "infinite series"]],
	["Algebra", ["algebra", "algebre", "group theory", "ring theory", "field theory", "galois", "matrices", "determinant", "linear algebra"]],
	["Geometry", ["geometry", "geometrie", "conic section", "projective", "euclid", "trigonometry"]],
	["Numerical & Applied Mathematics", ["numerical", "computation", "optimization", "operations research", "applied mathematics", "mathematical physics", "mechanics"]],
	["History & Education", ["history of mathematics", "mathematicians", "biography", "study and teaching", "mathematics education"]],
];

// مصطلحات تثبت أن العمل رياضي حتى لو لم يطابق تصنيفًا دقيقًا
const BASE_MATH_TERMS = ["mathematic", "mathematik", "mathematique", "mathematical", "arithmetic", "theorem", "equation"];

function haystack(terms: string[]): string {
	return terms.filter(Boolean).join(" | ").toLowerCase();
}

/** يعيد التصنيف المناسب انطلاقًا من المواضيع والعنوان */
export function detectCategory(terms: string[]): string {
	const hay = haystack(terms);
	for (const [category, keywords] of CATEGORY_RULES) {
		if (keywords.some((k) => hay.includes(k))) return category;
	}
	return FALLBACK_CATEGORY;
}

/** فلتر الرياضيات — يمنع دخول الضجيج إلى المكتبة */
export function isMathematics(terms: string[]): boolean {
	const hay = haystack(terms);
	if (BASE_MATH_TERMS.some((k) => hay.includes(k))) return true;
	return CATEGORY_RULES.some(([, keywords]) => keywords.some((k) => hay.includes(k)));
}

// رخص تسمح بإعادة التوزيع (أي: يجوز استضافة الملف عندنا على R2)
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
