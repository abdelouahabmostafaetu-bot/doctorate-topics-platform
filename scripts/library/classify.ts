// محرّك تصنيف الكتب — خوارزمي بحت، حتمي، بلا أي نداء خارجي.
//
// يعمل على مرحلتين:
//
//   الأولى — أدلة موزونة:
//     أ) وزن الحقل: رأس الموضوع (LCSH) أقوى ثلاث مرات من الملخّص، لأنه وصف مفهرس
//        محترف لا نص دعائي.
//     ب) وزن التخصيص: العبارة الثلاثية تساوي أربعة أضعاف الكلمة المفردة.
//     ج) مطابقة بحدود الكلمات مع طيّ الجمع — تمنع أخطاء includes() الطرفية.
//     د) أدلة مضادة تطرح من النتيجة، وكشف السير الذاتية من أسماء الرياضيين.
//     هـ) هامش ثقة: إذا تقارب الأول والثاني فالقرار مؤجّل لا محسوم.
//
//   الثانية — تعلّم ذاتي (TF-IDF + مركز أقرب):
//     الكتب التي حُسمت في المرحلة الأولى تصير أمثلة تدريب، تُضاف إليها كلمات التصنيف
//     نفسها كوثائق بذرة، ثم يُقاس المتبقّي بجيب الزاوية.
//     فكتاب عنوانه "Elements of the Theory of Functions" يلتحق بالتحليل لأن ألفاظه
//     تشبه ألفاظ كتب التحليل في الدفعة نفسها، لا لأنه حمل كلمة مفتاحية.

import { FALLBACK_CATEGORY, TAXONOMY } from "./taxonomy";

export type BookFields = {
	title: string;
	subjects: string[];
	summary?: string;
};

export type Verdict = {
	category: string;
	score: number;
	/** الفرق عن الباب التالي — مقياس الحسم */
	margin: number;
	method: "keyword" | "learned" | "none";
};

// أدلة مضادة: وجودها يضعف الباب ولا يلغيه
const ANTI: Record<string, string[]> = {
	Geometry: ["lettering", "perspective drawing", "ornament", "heraldry"],
	"Mathematical Statistics": ["vital statistics", "census", "trade statistics"],
	"Probability Theory": ["gambling systems"],
	"Discrete Mathematics & Algorithms": ["knitting", "recipe"],
	"Mathematical Physics & Mechanics": ["automobile", "steam engine", "aviation"],
	// "natural philosophy" في القرن الثامن عشر تعني الفيزياء لا فلسفة الرياضيات
	"Philosophy & Education of Mathematics": ["natural philosophy", "moral philosophy", "religion"],
	"History & Biography of Mathematics": ["natural history", "church history", "military history"],
};

// رياضيون مشاهير — اسم أحدهم في عنوان قصير يعني سيرة لا مصنّفًا في الموضوع
const MATHEMATICIANS = [
	"euclid", "archimedes", "pythagoras", "diophantus", "apollonius", "ptolemy",
	"al khwarizmi", "khayyam", "fibonacci", "cardano", "napier", "descartes",
	"fermat", "pascal", "newton", "leibniz", "bernoulli", "euler", "lagrange",
	"laplace", "legendre", "gauss", "cauchy", "abel", "galois", "jacobi",
	"dirichlet", "riemann", "weierstrass", "dedekind", "cantor", "kronecker",
	"klein", "poincare", "hilbert", "minkowski", "lebesgue", "borel", "hardy",
	"ramanujan", "noether", "banach", "kolmogorov", "godel", "turing", "von neumann",
	"sylvester", "cayley", "hamilton", "boole", "de morgan", "lobachevski", "bolyai",
	"kovalevskaya", "somerville", "agnesi", "hypatia",
];

const BIOGRAPHY_CUES = [
	"life of", "life and work", "biography", "memoir", "correspondence of",
	"letters of", "a short account of the history", "history of",
];

// أوزان الحقول
const W_SUBJECT = 3;
const W_TITLE = 2;
const W_SUMMARY = 1;

// أقل نتيجة تُعتبر حسمًا، وأقل فارق عن المنافس.
// أربعة = كلمة مفردة في العنوان وحده (2 × 2). دون ذلك لا دليل أصلًا.
const MIN_SCORE = 4;
const MIN_MARGIN = 3;

/** تطبيع: تجريد من التشكيل والرموز، وتوحيد المسافات */
export function normalizeText(input: string): string {
	return (input || "")
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

/** مطابقة بحدود الكلمات مع قبول صيغ الجمع الشائعة */
function contains(paddedHay: string, phrase: string): boolean {
	if (!phrase) return false;
	return (
		paddedHay.includes(" " + phrase + " ") ||
		paddedHay.includes(" " + phrase + "s ") ||
		paddedHay.includes(" " + phrase + "es ")
	);
}

/** العبارة الطويلة دليل أقوى بكثير من الكلمة المفردة */
function specificity(phrase: string): number {
	const words = phrase.split(" ").length;
	if (words >= 3) return 9;
	if (words === 2) return 5;
	return 2;
}

/** المرحلة الأولى: تصنيف بالأدلة الموزونة */
export function classifyFields(fields: BookFields): Verdict {
	const title = normalizeText(fields.title);
	const subjects = normalizeText((fields.subjects || []).join(" | "));
	const summary = normalizeText(fields.summary || "");

	const padded: Array<{ hay: string; weight: number }> = [
		{ hay: " " + subjects + " ", weight: W_SUBJECT },
		{ hay: " " + title + " ", weight: W_TITLE },
		{ hay: " " + summary + " ", weight: W_SUMMARY },
	];
	const all = " " + [subjects, title, summary].join(" ") + " ";

	const scores = new Map<string, number>();

	for (const category of TAXONOMY) {
		let score = 0;
		for (const raw of category.keywords) {
			const keyword = normalizeText(raw);
			const weight = specificity(keyword);
			for (const field of padded) {
				if (contains(field.hay, keyword)) score += weight * field.weight;
			}
		}
		for (const anti of ANTI[category.name] || []) {
			if (contains(all, normalizeText(anti))) score -= 15;
		}
		if (score > 0) scores.set(category.name, score);
	}

	// سيرة رياضي: اسم في عنوان قصير، أو لفظ من ألفاظ التراجم
	const titleWords = title ? title.split(" ").length : 0;
	const paddedTitle = " " + title + " ";
	const named = MATHEMATICIANS.some((n) => contains(paddedTitle, n));
	const biographic = BIOGRAPHY_CUES.some((c) => paddedTitle.includes(" " + normalizeText(c) + " "));
	if (named && (titleWords <= 4 || biographic)) {
		const name = "History & Biography of Mathematics";
		scores.set(name, (scores.get(name) || 0) + 24);
	}

	const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
	if (!ranked.length) return { category: FALLBACK_CATEGORY, score: 0, margin: 0, method: "none" };

	const [bestName, bestScore] = ranked[0];
	const margin = bestScore - (ranked[1] ? ranked[1][1] : 0);

	if (bestScore < MIN_SCORE || margin < MIN_MARGIN) {
		return { category: FALLBACK_CATEGORY, score: bestScore, margin, method: "none" };
	}
	return { category: bestName, score: bestScore, margin, method: "keyword" };
}

// ===== المرحلة الثانية: التعلّم الذاتي =====

const STOPWORDS = new Set([
	"the", "and", "for", "with", "from", "its", "his", "her", "their", "our", "this",
	"that", "these", "those", "are", "was", "were", "been", "being", "has", "had",
	"have", "not", "but", "all", "any", "can", "may", "one", "two", "new", "first",
	"second", "third", "volume", "vol", "part", "edition", "book", "books", "work",
	"works", "being", "upon", "into", "out", "who", "which", "what", "how", "why",
	"some", "more", "most", "other", "such", "than", "then", "them", "they", "you",
	"your", "use", "used", "including", "etc", "illustrated", "complete", "account",
]);

function tokenize(text: string): string[] {
	return normalizeText(text)
		.split(" ")
		.filter((t) => t.length > 2 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

function termFrequency(tokens: string[]): Map<string, number> {
	const tf = new Map<string, number>();
	for (const token of tokens) tf.set(token, (tf.get(token) || 0) + 1);
	return tf;
}

function l2Normalize(vector: Map<string, number>): void {
	let sum = 0;
	for (const value of vector.values()) sum += value * value;
	const norm = Math.sqrt(sum);
	if (!norm) return;
	for (const [key, value] of vector) vector.set(key, value / norm);
}

export type LearnItem = {
	title: string;
	summary: string;
	category: string;
};

/**
 * يبني مراكز ثقل لكل باب من كتب الدفعة المحسومة (زائد كلمات التصنيف كوثائق بذرة)،
 * ثم يسند إليها الكتب المتبقية بجيب الزاوية. يعدّل items موضعيًا ويعيد عدد ما أُسند.
 */
export function learnAndAssign(items: LearnItem[], minSimilarity = 0.11): number {
	const docs: Array<{ category: string; tokens: string[] }> = [];

	// وثائق بذرة — تضمن ألّا يكون الباب فارغًا حتى لو لم يرد في الدفعة
	for (const category of TAXONOMY) {
		const tokens = category.keywords.flatMap((k) => tokenize(k));
		docs.push({ category: category.name, tokens });
		docs.push({ category: category.name, tokens });
	}

	const pending: LearnItem[] = [];
	for (const item of items) {
		if (item.category === FALLBACK_CATEGORY) {
			pending.push(item);
			continue;
		}
		docs.push({ category: item.category, tokens: tokenize(item.title + " " + item.summary) });
	}
	if (!pending.length) return 0;

	// IDF على مجموع الوثائق
	const documentFrequency = new Map<string, number>();
	for (const doc of docs) {
		for (const token of new Set(doc.tokens)) {
			documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
		}
	}
	const total = docs.length;
	const idf = (token: string): number =>
		Math.log(1 + total / (1 + (documentFrequency.get(token) || 0)));

	// مراكز الثقل
	const centroids = new Map<string, Map<string, number>>();
	for (const doc of docs) {
		let centroid = centroids.get(doc.category);
		if (!centroid) {
			centroid = new Map<string, number>();
			centroids.set(doc.category, centroid);
		}
		for (const [token, count] of termFrequency(doc.tokens)) {
			centroid.set(token, (centroid.get(token) || 0) + count * idf(token));
		}
	}
	for (const centroid of centroids.values()) l2Normalize(centroid);

	// الإسناد
	let assigned = 0;
	for (const item of pending) {
		const vector = new Map<string, number>();
		for (const [token, count] of termFrequency(tokenize(item.title + " " + item.summary))) {
			vector.set(token, count * idf(token));
		}
		l2Normalize(vector);
		if (!vector.size) continue;

		let bestName = "";
		let best = 0;
		let runnerUp = 0;
		for (const [name, centroid] of centroids) {
			let dot = 0;
			for (const [token, value] of vector) {
				const other = centroid.get(token);
				if (other) dot += value * other;
			}
			if (dot > best) {
				runnerUp = best;
				best = dot;
				bestName = name;
			} else if (dot > runnerUp) {
				runnerUp = dot;
			}
		}

		if (bestName && best >= minSimilarity && best - runnerUp >= 0.015) {
			item.category = bestName;
			assigned++;
		}
	}

	return assigned;
}
