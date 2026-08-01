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

// الكلمات مأخوذة من رؤوس الموضوعات الفعلية (LCSH) المستعملة في Project Gutenberg
// ومن أسماء الموضوعات في OpenAlex. الترتيب يحسم التعادل: الأخص أولًا.
//
// قاعدة التحرير: لا تضف كلمة مفردة شائعة مثل "tables" أو "engineering"،
// فهي ترد في رؤوس موضوعات لا تحصى وتجرّ كتبًا إلى التصنيف الخطأ.
const CATEGORY_RULES: Array<[string, string[]]> = [
	[
		"Number Theory",
		[
			"number theory", "numbers, theory of", "theory of numbers", "prime number", "primes",
			"diophantine", "fermat", "congruence", "continued fraction", "arithmetic function",
			"perfect number", "factorization", "theorie des nombres", "zahlentheorie",
		],
	],
	[
		"Logic & Set Theory",
		[
			"symbolic logic", "mathematical logic", "set theory", "theory of sets", "logic",
			"foundations of mathematics", "computability", "godel", "recursive function",
			"boolean", "syllogism", "axiom", "paradox", "transfinite", "infinity",
			"proof theory", "fallacies", "reasoning",
		],
	],
	[
		"Topology",
		[
			"topology", "topologie", "manifold", "homology", "homotopy", "knot theory",
			"fourth dimension", "four-dimensional", "hyperspace",
		],
	],
	[
		"Differential Equations",
		[
			"differential equation", "partial differential", "dynamical system",
			"equations differentielles", "boundary value", "laplace equation",
			"heat equation", "wave equation", "calculus of variations",
		],
	],
	[
		"Probability & Statistics",
		[
			"probability", "probabilit", "statistic", "stochastic", "random variable",
			"bayes", "markov", "least squares", "correlation", "actuarial",
			"life insurance", "games of chance", "error of observation",
		],
	],
	[
		"Analysis",
		[
			"mathematical analysis", "functional analysis", "measure theory", "infinitesimal",
			"differential calculus", "integral calculus", "calculus", "integral", "derivative",
			"fourier", "infinite series", "convergence", "complex variable",
			"elliptic function", "real variable", "analyse", "analysis",
		],
	],
	[
		"Algebra",
		[
			"linear algebra", "abstract algebra", "group theory", "groups, theory of",
			"ring theory", "field theory", "galois", "determinant", "matrices", "matrix",
			"quaternion", "vector analysis", "equations, theory of", "polynomial",
			"invariant", "quadratic", "algebra", "algebre",
		],
	],
	[
		"Geometry",
		[
			"analytic geometry", "descriptive geometry", "solid geometry", "non-euclidean",
			"projective geometry", "differential geometry", "conic section", "euclid",
			"polyhedra", "mensuration", "squaring the circle", "curves", "surfaces",
			"geometrical", "geometry", "geometrie",
		],
	],
	[
		"Trigonometry",
		[
			"plane trigonometry", "spherical trigonometry", "trigonometry", "trigonometric",
			"logarithm", "sine", "cosine",
		],
	],
	[
		"Arithmetic & Number Systems",
		[
			"commercial arithmetic", "business mathematics", "ratio and proportion",
			"weights and measures", "ready reckoner", "numeration", "fractions",
			"decimal", "percentage", "abacus", "counting", "arithmetic",
		],
	],
	[
		"Recreational Mathematics",
		[
			"mathematical recreations", "magic square", "puzzle", "amusements",
			"curiosities", "riddles", "dissection", "tricks", "games",
		],
	],
	[
		"Numerical & Applied Mathematics",
		[
			// عبارات مركّبة فقط — المفردات العامة كانت تبتلع ربع المكتبة
			"applied mathematics", "mathematical physics", "operations research",
			"numerical analysis", "numerical method", "numerical calculation",
			"calculating machine", "slide rule", "nomograph", "mathematical tables",
			"logarithmic tables", "engineering mathematics", "celestial mechanics",
			"analytical mechanics", "applied mechanics", "linear programming",
			"optimization", "interpolation",
		],
	],
	[
		"History & Education",
		[
			"history of mathematics", "philosophy of mathematics", "study and teaching",
			"mathematics education", "mathematicians", "biography", "popular works",
			"essays", "lectures",
		],
	],
];

// مصطلحات تثبت أن العمل رياضي حتى لو لم يطابق تصنيفًا دقيقًا
const BASE_MATH_TERMS = [
	"mathematic", "mathematik", "mathematique", "mathematical", "arithmetic", "theorem", "equation",
];

function haystack(terms: string[]): string {
	return terms.filter(Boolean).join(" | ").toLowerCase();
}

/**
 * يعيد التصنيف المناسب انطلاقًا من المواضيع والعنوان.
 *
 * لا نكتفي بأول قاعدة تطابق، بل نحسب نقاطًا لكل تصنيف: كتاب موضوعاته
 * "Geometry, Analytic | Curves | Surfaces" ينال ثلاث مطابقات في الهندسة فيغلب
 * مطابقة واحدة عابرة في تصنيف آخر. والعبارات الطويلة أدلّ من القصيرة.
 */
export function detectCategory(terms: string[]): string {
	const hay = haystack(terms);
	let best = FALLBACK_CATEGORY;
	let bestScore = 0;

	for (const [category, keywords] of CATEGORY_RULES) {
		let score = 0;
		for (const keyword of keywords) {
			if (!hay.includes(keyword)) continue;
			// عبارة مركّبة مثل "analytic geometry" أقوى دلالة من كلمة مفردة
			score += keyword.includes(" ") ? 3 : 2;
		}
		// المقارنة صارمة ليفوز التصنيف الأخص عند التعادل
		if (score > bestScore) {
			bestScore = score;
			best = category;
		}
	}

	return bestScore > 0 ? best : FALLBACK_CATEGORY;
}

/** فلتر الرياضيات — يمنع دخول الضجيج إلى المكتبة */
export function isMathematics(terms: string[]): boolean {
	const hay = haystack(terms);
	if (BASE_MATH_TERMS.some((k) => hay.includes(k))) return true;
	return CATEGORY_RULES.some(([, keywords]) => keywords.some((k) => hay.includes(k)));
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
