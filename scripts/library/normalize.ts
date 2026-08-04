// التطبيع وتوليد المفاتيح — يمنع التكرار بين المصادر المختلفة

/** تطبيع العربية: الهمزات والألف المقصورة والتاء المربوطة والتشكيل */
export function normalizeArabic(s: string): string {
	return s
		.replace(/[\u0623\u0625\u0622]/g, "\u0627") // أ إ آ -> ا
		.replace(/\u0649/g, "\u064a") // ى -> ي
		.replace(/\u0629/g, "\u0647") // ة -> ه
		.replace(/[\u064b-\u0652\u0670\u0640]/g, ""); // التشكيل والتطويل
}

/** إزالة اللكنات اللاتينية: é -> e ç -> c ... (مهم للفرنسية) */
export function stripAccents(s: string): string {
	return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** عنوان مطبّع للبحث ولكشف التكرار */
export function titleNorm(title: string): string {
	return normalizeArabic(stripAccents(title.toLowerCase()))
		.replace(/[^\p{L}\p{N}\s]/gu, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export function slugify(s: string, maxLen = 80): string {
	const base = normalizeArabic(stripAccents(s.toLowerCase()))
		.replace(/[^\p{L}\p{N}]+/gu, "-")
		.replace(/^-+|-+$/g, "");
	return base.slice(0, maxLen).replace(/-+$/g, "") || "book";
}

export function normalizeIsbn(raw?: string): string | undefined {
	if (!raw) return undefined;
	const d = raw.replace(/[^0-9Xx]/g, "").toUpperCase();
	if (d.length === 13) return d;
	if (d.length === 10) return d; // التحويل إلى 13 يتم في مرحلة الإثراء
	return undefined;
}

export function normalizeDoi(raw?: string): string | undefined {
	if (!raw) return undefined;
	const d = raw
		.trim()
		.toLowerCase()
		.replace(/^https?:\/\/(dx\.)?doi\.org\//, "")
		.replace(/^doi:/, "");
	return d.startsWith("10.") ? d : undefined;
}

function lastName(author?: string): string {
	if (!author) return "anon";
	const parts = author.replace(/,/g, " ").trim().split(/\s+/);
	return slugify(parts[parts.length - 1] ?? "anon", 24);
}

/**
 * مفتاح موحّد لكشف التكرار، بالأفضلية:
 * DOI ثم ISBN-13 ثم (عنوان مطبّع + سنة + لقب أول مؤلف).
 */
export function canonicalKey(item: {
	doi?: string;
	isbn13?: string;
	title: string;
	year: number;
	authors?: string[];
}): string {
	const doi = normalizeDoi(item.doi);
	if (doi) return `doi:${doi}`;

	const isbn = normalizeIsbn(item.isbn13);
	if (isbn) return `isbn:${isbn}`;

	const t = slugify(titleNorm(item.title), 60);
	return `t:${t}:${item.year}:${lastName(item.authors?.[0])}`;
}
