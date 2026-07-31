// تنظيف العناوين وأسماء المؤلفين القادمة من الفهارس.
// فهارس المكتبات تخزّن البيانات بصيغة الفهرسة لا بصيغة العرض:
//   "Ball, W. W. Rouse (Walter William Rouse)"  ← اسم مقلوب مع تكرار
//   "A SHORT ACCOUNT OF THE HISTORY OF MATHEMATICS"  ← حروف كبيرة بالكامل
//   "The Elements of Euclid; Or, The First Six Books"  ← عنوان فرعي بصيغة قديمة

const SMALL_WORDS = new Set([
	"a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into",
	"nor", "of", "on", "or", "over", "per", "the", "to", "upon", "via", "with",
]);

// أرقام رومانية تبقى بحروف كبيرة: Book II لا Book Ii
const ROMAN_NUMERAL = /^(?=[ivxlcdm]{2,}$)m*(c[md]|d?c{0,3})(x[cl]|l?x{0,3})(i[xv]|v?i{0,3})$/i;

const NOISE = [
	/\s*[([](?:illustrated|annotated|complete|unabridged|revised edition|new edition|second edition|third edition)[)\]]/gi,
];

function isAllCaps(value: string): boolean {
	return /[A-Z]/.test(value) && value === value.toUpperCase();
}

function isAllLower(value: string): boolean {
	return /[a-z]/.test(value) && value === value.toLowerCase();
}

function capitalizeWord(word: string): string {
	// يراعي الشرطة والفاصلة العليا: jean-pierre ← Jean-Pierre ، o'brien ← O'Brien
	return word
		.split(/([-'\u2019])/)
		.map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
		.join("");
}

/** تحويل إلى أحرف العناوين — يُستعمل فقط عندما يكون النص كله كبيرًا أو كله صغيرًا */
export function toTitleCase(value: string): string {
	const words = value.toLowerCase().split(" ");
	return words
		.map((word, index) => {
			if (!word) return word;
			if (ROMAN_NUMERAL.test(word)) return word.toUpperCase();
			const isEdge = index === 0 || index === words.length - 1;
			if (!isEdge && SMALL_WORDS.has(word)) return word;
			return capitalizeWord(word);
		})
		.join(" ");
}

/** عنوان نظيف صالح للعرض */
export function cleanTitle(raw: string): string {
	let value = (raw || "").replace(/\r\n|\r|\n/g, " ");
	value = value.replace(/\s+/g, " ").trim();

	for (const pattern of NOISE) value = value.replace(pattern, "");

	// "Title; Or, Subtitle" ← "Title — Subtitle"
	value = value.replace(/;\s*or,?\s*/i, " \u2014 ");
	// توحيد النقطتين
	value = value.replace(/\s*:\s*/g, ": ");
	value = value.replace(/\s+/g, " ").trim();
	// إزالة علامات الترقيم المعلّقة في الآخر
	value = value.replace(/[.,;:\-\u2013\u2014\s]+$/, "").trim();

	if (isAllCaps(value) || isAllLower(value)) value = toTitleCase(value);

	return value.slice(0, 200);
}

/** اسم مؤلف بصيغة العرض (الاسم ثم اللقب) */
export function cleanAuthor(raw: string): string {
	let value = (raw || "").replace(/\s+/g, " ").trim();
	if (!value) return "Unknown";

	// إزالة سنوات الميلاد والوفاة: "Euclid, 1801-1873"
	value = value.replace(/,?\s*\d{3,4}\s*[-\u2013]\s*\d{0,4}\s*$/, "").trim();

	// "Ball, W. W. Rouse (Walter William Rouse)" ← "Walter William Rouse Ball"
	const withParens = value.match(/^([^(]+)\(([^)]+)\)\s*$/);
	if (withParens) {
		const surname = withParens[1].split(",")[0].trim();
		const fullFirst = withParens[2].trim();
		value = (fullFirst + " " + surname).trim();
	} else if (value.includes(",")) {
		// "Euler, Leonhard" ← "Leonhard Euler"
		const parts = value.split(",");
		const surname = parts[0].trim();
		const given = parts.slice(1).join(",").trim();
		if (given) value = given + " " + surname;
	}

	value = value.replace(/\s+/g, " ").replace(/[,;]+$/, "").trim();
	if (isAllCaps(value) || isAllLower(value)) value = toTitleCase(value);

	return value.slice(0, 120) || "Unknown";
}
