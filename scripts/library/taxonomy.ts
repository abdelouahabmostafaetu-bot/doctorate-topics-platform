// تصنيف المكتبة — مبني على Mathematics Subject Classification 2020
// (المعيار الذي تعتمده AMS و zbMATH و Zentralblatt)
//
// كل باب يحمل رمزه في MSC حتى يسهل لاحقًا بناء تصفّح ذي مستويين.
//
// قواعد التحرير:
//   1. الترتيب من الأخص إلى الأعم — فهو يحسم التعادل في النقاط.
//   2. لا تضف كلمة مفردة شائعة (tables، engineering، games) — تجرّ كتبًا إلى الباب الخطأ.
//   3. ولا تضف تقسيمات شكلية من LCSH مثل "addresses, essays, lectures" أو "biography"
//      إلى GATE_TERMS — فهي ترد على كتب كل التخصصات وتفتح الباب للضجيج.

export type Category = {
	name: string;
	msc: string;
	keywords: string[];
};

export const TAXONOMY: Category[] = [
	// ===== رياضيات متقطعة =====
	{
		name: "Graph Theory",
		msc: "05C",
		keywords: ["graph theory", "theory of graphs", "planar graph", "graph coloring", "spanning tree", "network flow", "directed graph", "adjacency", "hamiltonian cycle", "eulerian", "map-coloring", "four color"],
	},
	{
		name: "Combinatorics",
		msc: "05",
		keywords: ["combinatorics", "combinatorial analysis", "combinatorial", "enumeration", "permutations and combinations", "generating function", "ramsey theory", "design theory", "latin square", "partitions"],
	},
	{
		name: "Discrete Mathematics & Algorithms",
		msc: "68",
		keywords: ["discrete mathematics", "algorithms and data structures", "data structures", "computer algebra", "symbolic computation", "computational complexity", "automata theory", "formal language", "cryptography", "coding theory", "algorithm"],
	},

	// ===== منطق وأسس =====
	{
		name: "Set Theory",
		msc: "03E",
		keywords: ["set theory", "theory of sets", "transfinite", "cardinal number", "ordinal number", "axiom of choice", "continuum hypothesis", "zermelo"],
	},
	{
		name: "Fuzzy Logic & Applications",
		msc: "03B52",
		keywords: ["fuzzy logic", "fuzzy set", "fuzzy system", "fuzzy control", "fuzzy"],
	},
	{
		name: "Mathematical Logic & Foundations",
		msc: "03",
		keywords: ["mathematical logic", "symbolic logic", "foundations of mathematics", "model theory", "proof theory", "computability", "recursive function", "incompleteness", "godel", "boolean algebra", "predicate calculus", "syllogism", "fallacies", "paradox", "logic"],
	},

	// ===== نظرية الأعداد =====
	{
		name: "Number Theory",
		msc: "11",
		keywords: ["number theory", "theory of numbers", "numbers, theory of", "prime number", "diophantine", "continued fraction", "congruence", "fermat", "riemann zeta", "modular form", "perfect number", "factorization", "factorial", "mathematical constant", "irrational number", "transcendental number", "zahlentheorie", "theorie des nombres"],
	},

	// ===== جبر =====
	{
		name: "Category Theory & Homological Algebra",
		msc: "18",
		keywords: ["category theory", "homological algebra", "cohomology", "sheaf theory", "functor", "exact sequence", "derived category"],
	},
	{
		name: "Algebraic Geometry",
		msc: "14",
		keywords: ["algebraic geometry", "algebraic curve", "algebraic variety", "algebraic surface", "scheme theory", "elliptic curve", "riemann surface"],
	},
	{
		name: "Group Theory & Symmetry",
		msc: "20",
		keywords: ["group theory", "theory of groups", "groups, theory of", "representation theory", "finite group", "permutation group", "lie group", "lie algebra", "symmetry", "character theory"],
	},
	{
		name: "Rings, Fields & Galois Theory",
		msc: "12-16",
		keywords: ["ring theory", "field theory", "galois theory", "galois", "commutative algebra", "ideal theory", "module theory", "noetherian", "algebraic number field"],
	},
	{
		name: "Linear & Multilinear Algebra",
		msc: "15",
		keywords: ["linear algebra", "matrix theory", "matrices", "determinant", "vector space", "vector analysis", "eigenvalue", "tensor analysis", "tensor calculus", "quaternion", "bilinear form"],
	},
	{
		name: "Algebra",
		msc: "08",
		keywords: ["abstract algebra", "modern algebra", "universal algebra", "lattice theory", "equations, theory of", "theory of equations", "polynomial", "invariant theory", "quadratic form", "algebra", "algebre"],
	},

	// ===== تحليل =====
	{
		name: "Complex Analysis",
		msc: "30",
		keywords: ["complex analysis", "complex variable", "functions of a complex", "analytic function", "conformal mapping", "elliptic function", "residue theorem", "meromorphic"],
	},
	{
		name: "Functional Analysis",
		msc: "46",
		keywords: ["functional analysis", "banach space", "hilbert space", "normed space", "topological vector space", "distribution theory", "fixed point theorem"],
	},
	{
		name: "Operator Theory",
		msc: "47",
		keywords: ["operator theory", "linear operator", "spectral theory", "self-adjoint", "compact operator", "semigroup of operators"],
	},
	{
		name: "Harmonic Analysis & Wavelets",
		msc: "42-43",
		keywords: ["harmonic analysis", "fourier series", "fourier analysis", "fourier transform", "fourier", "trigonometric series", "wavelet", "signal processing", "laplace transform", "integral transform"],
	},
	{
		name: "Special Functions & Approximation",
		msc: "33-41",
		keywords: ["special function", "orthogonal polynomial", "bessel function", "gamma function", "hypergeometric", "approximation theory", "asymptotic expansion", "legendre function"],
	},
	{
		name: "Real Analysis & Measure Theory",
		msc: "26-28",
		keywords: ["real analysis", "measure theory", "lebesgue", "differential calculus", "integral calculus", "infinitesimal calculus", "infinite series", "real variable", "convergence", "calculus", "analysis", "analyse"],
	},

	// ===== معادلات تفاضلية وأنظمة =====
	{
		name: "Partial Differential Equations",
		msc: "35",
		keywords: ["partial differential equation", "boundary value problem", "heat equation", "wave equation", "laplace equation", "elliptic equation", "navier-stokes"],
	},
	{
		name: "Ordinary Differential Equations",
		msc: "34",
		keywords: ["ordinary differential equation", "differential equation", "equations differentielles", "sturm-liouville", "integral equation", "difference equation"],
	},
	{
		name: "Dynamical Systems & Chaos",
		msc: "37",
		keywords: ["dynamical system", "chaos theory", "chaotic", "ergodic theory", "bifurcation", "attractor", "fractal", "iterated map"],
	},
	{
		name: "Calculus of Variations & Optimal Control",
		msc: "49",
		keywords: ["calculus of variations", "optimal control", "pontryagin", "hamilton-jacobi", "variational method", "variational principle"],
	},

	// ===== هندسة وطوبولوجيا =====
	{
		name: "Differential Geometry",
		msc: "53",
		keywords: ["differential geometry", "riemannian geometry", "curvature", "geodesic", "manifold", "fibre bundle", "connection form"],
	},
	{
		name: "Topology",
		msc: "54-57",
		keywords: ["algebraic topology", "general topology", "point set topology", "topology", "topologie", "homology", "homotopy", "knot theory", "fourth dimension", "hyperspace"],
	},
	{
		name: "Geometry",
		msc: "51",
		keywords: ["analytic geometry", "descriptive geometry", "solid geometry", "projective geometry", "non-euclidean geometry", "convex geometry", "conic section", "euclid", "polyhedra", "mensuration", "squaring the circle", "geometrical", "geometry", "geometrie", "curves", "surfaces"],
	},
	{
		name: "Trigonometry",
		msc: "51-XX",
		keywords: ["plane trigonometry", "spherical trigonometry", "trigonometry", "trigonometric", "logarithm", "cosine", "sine"],
	},

	// ===== احتمال وإحصاء =====
	{
		name: "Probability Theory",
		msc: "60",
		keywords: ["probability theory", "probabilities", "probability", "probabilit", "stochastic process", "random variable", "markov chain", "brownian motion", "martingale", "games of chance"],
	},
	{
		name: "Mathematical Statistics",
		msc: "62",
		keywords: ["mathematical statistics", "statistical inference", "statistics", "statistic", "regression analysis", "least squares", "correlation", "hypothesis testing", "sampling", "bayesian", "actuarial", "life insurance", "error of observation"],
	},

	// ===== رياضيات تطبيقية =====
	{
		name: "Numerical & Computational Mathematics",
		msc: "65",
		keywords: ["numerical analysis", "numerical method", "numerical calculation", "computational mathematics", "finite element", "finite difference", "interpolation", "calculating machine", "slide rule", "nomograph", "mathematical tables", "logarithmic tables"],
	},
	{
		name: "Optimization & Operations Research",
		msc: "90",
		keywords: ["operations research", "linear programming", "dynamic programming", "mathematical programming", "convex optimization", "optimization", "queueing theory", "inventory model", "scheduling"],
	},
	{
		name: "Game Theory",
		msc: "91A",
		keywords: ["game theory", "theory of games", "games and economic", "nash equilibrium", "zero-sum", "cooperative game"],
	},
	{
		name: "Control & Systems Theory",
		msc: "93",
		keywords: ["control theory", "automatic control", "systems theory", "feedback control", "servomechanism", "state space model", "observability", "controllability"],
	},
	{
		name: "Mathematical Physics & Mechanics",
		msc: "70-82",
		keywords: ["mathematical physics", "analytical mechanics", "classical mechanics", "celestial mechanics", "quantum mechanics", "statistical mechanics", "fluid mechanics", "hydrodynamics", "elasticity", "thermodynamics", "relativity", "potential theory", "morphogenesis"],
	},

	// ===== عام =====
	{
		name: "Recreational Mathematics & Puzzles",
		msc: "00A08",
		keywords: ["mathematical recreations", "magic square", "mathematical puzzle", "puzzle", "amusements", "curiosities", "riddles", "dissection", "paper folding"],
	},
	{
		name: "Arithmetic & Elementary Mathematics",
		msc: "97F",
		keywords: ["commercial arithmetic", "business mathematics", "mental arithmetic", "ratio and proportion", "weights and measures", "ready reckoner", "elementary mathematics", "number concept", "numeration", "numerals", "numeral", "fractions", "decimal", "percentage", "abacus", "reckoning", "counting", "arithmetic"],
	},
	{
		name: "History & Biography of Mathematics",
		msc: "01",
		keywords: ["history of mathematics", "mathematics -- history", "mathematics, chinese", "chinese mathematics", "greek mathematics", "mathematicians", "biography", "ancient", "medieval", "quotations"],
	},
	{
		name: "Philosophy & Education of Mathematics",
		msc: "97",
		keywords: ["philosophy of mathematics", "philosophy of science", "mathematics -- philosophy", "science -- philosophy", "study and teaching", "mathematics education", "popular works", "philosophy", "hypothesis", "curriculum"],
	},
];

/** الباب الافتراضي عندما تعجز كل القواعد */
export const FALLBACK_CATEGORY = "General Mathematics";

/** أسماء الأبواب فقط — تُرسل إلى المصنّف الذكي */
export const CATEGORY_NAMES: string[] = TAXONOMY.map((c) => c.name);

/** رمز MSC لباب معيّن (مفيد للعرض والترتيب) */
export function mscFor(name: string): string {
	return TAXONOMY.find((c) => c.name === name)?.msc || "00";
}

// مصطلحات رياضية قاطعة — وجود أحدها وحده يُدخل الكتاب دون نقاش.
// لا تضع هنا إلا ما لا يرد إلا في سياق رياضي.
export const GATE_TERMS: string[] = [
	"mathematical", "mathematics", "arithmetic", "algebra", "geometry", "geometrical",
	"trigonometry", "trigonometric", "calculus", "topology", "number theory",
	"theory of numbers", "prime number", "set theory", "symbolic logic",
	"differential equation", "integral calculus", "differential calculus",
	"infinite series", "probability", "statistics", "combinatorics", "graph theory",
	"matrices", "determinant", "quaternion", "logarithm", "euclid", "conic",
	"polynomial", "numeration", "numerals", "fourier", "measure theory", "manifold",
	"numerical analysis", "operations research", "game theory", "theorem",
	"mathematiker", "mathematik", "mathematique", "geometrie",
];

// موضوعات تُسقط الكتاب إذا لم يحمل مصطلحًا رياضيًا قاطعًا.
// سببها: رفوف Gutenberg تضمّ أحيانًا كتبًا إلى رف "Mathematics" لصلة بعيدة
// (مثل مؤلفات فلورنس نايتنغيل لأنها كانت إحصائية)، فندخل كتب تمريض إلى مكتبة رياضيات.
export const DENY_TERMS: string[] = [
	"nursing", "nurses", "hospital", "red cross", "asylum", "insanity", "mad-house",
	"mental illness", "medicine", "materia medica", "surgery", "therapeutics",
	"chemistry", "botany", "zoology", "microscope", "cookery", "needlework",
	"architecture", "mosque", "gardening", "agriculture", "theology", "sermons",
	"social settlements", "charities", "journalism", "description and travel",
	"german language", "encyclopaedia britannica", "lettering", "calligraphy",
];
