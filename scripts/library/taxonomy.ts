// التصنيف الرياضي — مبني على MSC 2020 لا على تخمين.
// 14 تصنيفًا رئيسيًا: هذا ما يستعمله zbMATH والجمعيات الرياضياتية.

import type { Category, CategoryId } from "./types";

export const CATEGORIES: Category[] = [
	{
		id: "logic",
		ar: "المنطق والأسس",
		fr: "Logique et fondements",
		msc: ["03"],
		arxiv: ["math.LO"],
		subtopics: ["نظرية المجموعات", "نظرية النماذج", "الحسابية", "نظرية الإثبات"],
	},
	{
		id: "algebra",
		ar: "الجبر ونظرية الأعداد",
		fr: "Algèbre et théorie des nombres",
		msc: ["08", "11", "12", "13", "15", "16", "17", "18", "19", "20"],
		arxiv: ["math.AC", "math.NT", "math.RA", "math.GR", "math.RT", "math.CT", "math.KT"],
		subtopics: ["جبر خطي", "نظرية الزمر", "الحلقات والحقول", "نظرية الأعداد", "نظرية الفئات", "نظرية التمثيل"],
	},
	{
		id: "analysis",
		ar: "التحليل الرياضي",
		fr: "Analyse mathématique",
		msc: ["26", "28", "30", "31", "32", "33", "40", "41", "42", "43", "44", "46", "47"],
		arxiv: ["math.CA", "math.CV", "math.FA", "math.OA", "math.SP", "math.CT"],
		subtopics: ["تحليل حقيقي", "تحليل مركب", "تحليل دالّي", "نظرية القياس", "تحليل فورييه", "نظرية المؤثرات"],
	},
	{
		id: "pde",
		ar: "المعادلات التفاضلية",
		fr: "Équations différentielles",
		msc: ["34", "35", "37", "45"],
		arxiv: ["math.AP", "math.DS"],
		subtopics: ["معادلات عادية", "معادلات جزئية", "جمل ديناميكية", "نظرية الشوش", "فضاءات سوبوليف"],
	},
	{
		id: "geometry",
		ar: "الهندسة والطوبولوجيا",
		fr: "Géométrie et topologie",
		msc: ["14", "51", "52", "53", "54", "55", "57", "58"],
		arxiv: ["math.AG", "math.DG", "math.GT", "math.AT", "math.MG", "math.SG", "math.GN"],
		subtopics: ["هندسة جبرية", "هندسة تفاضلية", "طوبولوجيا جبرية", "طوبولوجيا عامة", "هندسة ريمانية"],
	},
	{
		id: "probability",
		ar: "الاحتمالات والإحصاء",
		fr: "Probabilités et statistiques",
		msc: ["60", "62"],
		arxiv: ["math.PR", "math.ST", "stat.TH", "stat.ME", "stat.ML"],
		subtopics: ["مسارات عشوائية", "الاستدلال الإحصائي", "سلاسل ماركوف", "تعلّم إحصائي", "حساب إيتو"],
	},
	{
		id: "numerical",
		ar: "التحليل العددي",
		fr: "Analyse numérique",
		msc: ["65"],
		arxiv: ["math.NA", "cs.NA"],
		subtopics: ["العناصر المنتهية", "الفروق المنتهية", "الحساب العلمي", "الجبر الخطي العددي"],
	},
	{
		id: "discrete",
		ar: "الرياضيات المتقطعة",
		fr: "Mathématiques discrètes",
		msc: ["05", "06"],
		arxiv: ["math.CO"],
		subtopics: ["التوافقيات", "نظرية البيانات", "الشبكات", "التعديد"],
	},
	{
		id: "optimization",
		ar: "التحسين والبحث العملياتي",
		fr: "Optimisation et recherche opérationnelle",
		msc: ["49", "90"],
		arxiv: ["math.OC"],
		subtopics: ["برمجة خطية", "تحسين محدّب", "تحكّم أمثل", "نظرية الألعاب", "تحسين عشوائي"],
	},
	{
		id: "mathphysics",
		ar: "الفيزياء الرياضية",
		fr: "Physique mathématique",
		msc: ["70", "74", "76", "78", "80", "81", "82", "83", "85", "86"],
		arxiv: ["math-ph", "math.MP"],
		subtopics: ["ميكانيك تحليلي", "ميكانيك الموائع", "نظرية الكمّ", "النسبية", "فيزياء إحصائية"],
	},
	{
		id: "computing",
		ar: "علوم الحاسوب الرياضية",
		fr: "Informatique mathématique",
		msc: ["68", "94"],
		arxiv: ["cs.DM", "cs.CC", "cs.DS", "cs.LO", "math.IT", "cs.IT"],
		subtopics: ["الخوارزميات", "نظرية التعقيد", "التشفير", "نظرية المعلومات", "الأوتوماتا"],
	},
	{
		id: "finance",
		ar: "الرياضيات المالية",
		fr: "Mathématiques financières",
		msc: ["91"],
		arxiv: ["q-fin.MF", "q-fin.PR", "q-fin.RM"],
		subtopics: ["تسعير المشتقّات", "إدارة المخاطر", "الاقتصاد القياسي", "رياضيات التأمين"],
	},
	{
		id: "biomath",
		ar: "الرياضيات الحيوية",
		fr: "Biomathématiques",
		msc: ["92"],
		arxiv: ["q-bio.PE", "q-bio.QM"],
		subtopics: ["نماذج وبائية", "ديناميكا السكّان", "بيولوجيا حسابية", "علم الأعصاب الرياضي"],
	},
	{
		id: "history",
		ar: "تاريخ الرياضيات وتعليمها",
		fr: "Histoire et enseignement",
		msc: ["00", "01", "97"],
		arxiv: ["math.HO"],
		subtopics: ["تاريخ الرياضيات", "ديداكتيك", "مراجع عامة", "مسائل ومسابقات"],
	},
];

export const CATEGORY_BY_ID: Record<CategoryId, Category> = Object.fromEntries(
	CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, Category>;

/** "35K05" -> "35" -> التصنيف */
export const MSC_MAP: Record<string, CategoryId> = (() => {
	const m: Record<string, CategoryId> = {};
	for (const c of CATEGORIES) for (const code of c.msc) m[code] = c.id;
	return m;
})();

export const ARXIV_MAP: Record<string, CategoryId> = (() => {
	const m: Record<string, CategoryId> = {};
	for (const c of CATEGORIES) for (const a of c.arxiv) if (!m[a]) m[a] = c.id;
	return m;
})();

/**
 * مواضيع OpenAlex الشائعة في الرياضيات.
 * القائمة قابلة للتوسيع تدريجيًا كلما ظهرت مواضيع جديدة في الحصاد.
 */
export const OPENALEX_MAP: Record<string, CategoryId> = {
	C33923547: "algebra", // Mathematics (جذر عام — يُستعمل كملاذ أخير)
	C202444582: "discrete", // Combinatorics / Pure mathematics
	C114614502: "algebra", // Algebra
	C134306372: "analysis", // Mathematical analysis
	C2524010: "geometry", // Geometry
	C105795698: "probability", // Statistics
	C28826006: "numerical", // Numerical analysis
	C121332964: "mathphysics", // Physics-adjacent
	C41008148: "computing", // Computer science
};

/**
 * مصنّف الكلمات المفتاحية — ثلاثي اللسان (عربي/إنجليزي/فرنسي).
 * الفرنسية ضرورية لأن مصادرنا الفرنسية (HAL, Numdam, SMF) والمنهج الجزائري فرنسيّان.
 */
export const KEYWORDS: Record<CategoryId, string[]> = {
	logic: [
		"set theory", "model theory", "proof theory", "computability", "recursion theory", "type theory",
		"théorie des ensembles", "logique", "calculabilité",
		"المنطق", "نظرية المجموعات", "الأسس",
	],
	algebra: [
		"algebra", "group theory", "ring", "field theory", "module", "galois", "lie algebra",
		"number theory", "category theory", "representation theory", "homological", "commutative",
		"algèbre", "groupe", "anneau", "corps", "théorie des nombres", "catégories",
		"جبر", "زمرة", "حلقة", "حقل", "نظرية الأعداد", "مصفوفات",
	],
	analysis: [
		"real analysis", "complex analysis", "functional analysis", "measure theory", "integration",
		"fourier", "harmonic analysis", "banach", "hilbert", "operator theory", "holomorphic",
		"analyse réelle", "analyse complexe", "analyse fonctionnelle", "théorie de la mesure", "intégration",
		"تحليل", "تكامل", "قياس", "دالّي", "مركب",
	],
	pde: [
		"partial differential equation", "ordinary differential equation", "elliptic", "parabolic",
		"hyperbolic", "sobolev", "dynamical system", "chaos", "navier-stokes", "boundary value",
		"équations aux dérivées partielles", "équations différentielles", "systèmes dynamiques",
		"معادلات تفاضلية", "جزئية", "جمل ديناميكية",
	],
	geometry: [
		"algebraic geometry", "differential geometry", "topology", "manifold", "riemannian",
		"scheme", "sheaf", "homotopy", "knot", "symplectic", "curvature",
		"géométrie", "topologie", "variété", "faisceau",
		"هندسة", "طوبولوجيا", "متعدد الطيّات", "انحناء",
	],
	probability: [
		"probability", "stochastic", "markov", "martingale", "brownian", "statistics",
		"statistical inference", "bayesian", "random", "regression",
		"probabilités", "statistique", "aléatoire", "stochastique",
		"احتمالات", "إحصاء", "عشوائي", "ماركوف",
	],
	numerical: [
		"numerical analysis", "finite element", "finite difference", "numerical method",
		"scientific computing", "iterative method", "discretization", "quadrature",
		"analyse numérique", "éléments finis", "méthodes numériques", "calcul scientifique",
		"تحليل عددي", "عناصر منتهية", "طرق عددية",
	],
	discrete: [
		"combinatorics", "graph theory", "discrete mathematics", "enumerative", "matroid",
		"lattice theory", "design theory", "ramsey",
		"combinatoire", "théorie des graphes", "mathématiques discrètes",
		"توافقيات", "نظرية البيانات", "متقطعة",
	],
	optimization: [
		"optimization", "linear programming", "convex", "optimal control", "game theory",
		"operations research", "variational", "integer programming",
		"optimisation", "programmation linéaire", "recherche opérationnelle", "contrôle optimal",
		"تحسين", "برمجة خطية", "بحث عملياتي", "نظرية الألعاب",
	],
	mathphysics: [
		"mathematical physics", "quantum", "relativity", "fluid mechanics", "elasticity",
		"statistical mechanics", "field theory", "electromagnetism", "thermodynamics",
		"physique mathématique", "mécanique", "quantique", "relativité", "fluides",
		"فيزياء رياضية", "ميكانيك", "كمّ", "نسبية", "موائع",
	],
	computing: [
		"algorithm", "complexity", "cryptography", "information theory", "automata",
		"coding theory", "formal verification", "machine learning theory",
		"algorithme", "complexité", "cryptographie", "théorie de l'information",
		"خوارزميات", "تعقيد", "تشفير", "نظرية المعلومات",
	],
	finance: [
		"mathematical finance", "option pricing", "derivative pricing", "risk management",
		"actuarial", "portfolio", "econometrics", "black-scholes",
		"mathématiques financières", "finance", "actuariat", "économétrie",
		"رياضيات مالية", "تسعير", "مخاطر", "تأمين",
	],
	biomath: [
		"mathematical biology", "epidemic model", "population dynamics", "computational biology",
		"bioinformatics", "neuroscience model", "ecology model",
		"biomathématiques", "biologie mathématique", "dynamique des populations", "épidémiologie",
		"رياضيات حيوية", "نماذج وبائية", "ديناميكا السكان",
	],
	history: [
		"history of mathematics", "mathematics education", "didactics", "olympiad",
		"problem book", "encyclopedia of mathematics", "biography",
		"histoire des mathématiques", "didactique", "enseignement", "olympiades",
		"تاريخ الرياضيات", "تعليم", "ديداكتيك", "أولمبياد", "مسابقات",
	],
};
