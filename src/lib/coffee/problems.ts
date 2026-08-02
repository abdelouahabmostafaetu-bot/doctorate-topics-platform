/**
 * ✦ «مسائل ممتعة» — Interesting Problems
 *
 * A small, curated, hand-written collection. No database needed: each problem
 * is plain Markdown + LaTeX ($ … $ inline, $$ … $$ display), so adding a new
 * one is just appending an object to the array below.
 *
 * The newest problem (first item) is what /coffee shows by default.
 */

export type Difficulty = 1 | 2 | 3

export interface InterestingProblem {
	/** stable url key — /coffee?p=<slug> */
	slug: string
	/** e.g. "Proposition 1.12" */
	label: string
	/** short Arabic title shown in the archive chips */
	title: string
	/** e.g. "Structures algébriques" */
	subject: string
	/** where it comes from */
	source?: string
	tags: string[]
	difficulty: Difficulty
	/** Markdown + LaTeX, LTR (French / English) */
	statement: string
	/** one short Arabic line: why this problem is worth 10 minutes */
	why?: string
	/** progressive Arabic hints */
	hints: string[]
	/** full proof, Markdown + LaTeX */
	solution: string
	/** ISO date */
	date: string
}

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
	1: "سهلة",
	2: "متوسطة",
	3: "متقدّمة",
}

export const PROBLEMS: InterestingProblem[] = [
	{
		slug: "sous-groupes-de-z",
		label: "Proposition 1.12",
		title: "زمر (ℤ,+) الجزئية",
		subject: "Structures algébriques — Théorie des groupes",
		source: "Cours d'algèbre 1 (L1/L2)",
		tags: ["Groupes", "Division euclidienne", "ℤ"],
		difficulty: 1,
		statement: String.raw`Soit $H$ un sous-groupe de $(\mathbb{Z},+)$. Il existe un **unique** $n \in \mathbb{N}$ tel que

$$H = n\mathbb{Z}.$$`,
		why: "نتيجة صغيرة الحجم، عظيمة الأثر: منها يولد المفهوم الكامل لـ pgcd و ppcm والمثاليات الرئيسية في ℤ.",
		hints: [
			"ابدأ بالحالة التافهة: إذا كان $H=\\{0\\}$ فما هو $n$ المناسب؟",
			"إذا كان $H \\neq \\{0\\}$، فهو يحتوي عنصرًا موجبًا تمامًا (لماذا؟). خذ $n$ **أصغر** عنصر موجب تمامًا في $H$ — مبدأ الترتيب الجيّد في $\\mathbb{N}$ يضمن وجوده.",
			"لإثبات $H \\subseteq n\\mathbb{Z}$: اقسم إقليديًا $h = qn + r$ مع $0 \\le r < n$، ثم لاحظ أن $r = h - qn \\in H$، وهذا يناقض أصغرية $n$ إلا إذا كان $r = 0$.",
		],
		solution: String.raw`**Preuve.**

**1) Existence.**

*Cas trivial.* Si $H = \{0\}$, alors $H = 0\mathbb{Z}$ et $n = 0$ convient.

*Cas général.* Supposons $H \neq \{0\}$ et choisissons $h \in H$ avec $h \neq 0$. Comme $H$ est un sous-groupe, $-h \in H$, donc $H$ contient l'entier strictement positif $|h|$. L'ensemble

$$H^{+} = \{\,k \in H \;:\; k > 0\,\}$$

est donc une partie **non vide** de $\mathbb{N}$ ; par le principe du bon ordre, il possède un plus petit élément

$$n = \min H^{+} \ \ (n \ge 1).$$

*Inclusion $n\mathbb{Z} \subseteq H$.* Puisque $n \in H$ et que $H$ est stable par addition et par passage à l'opposé, une récurrence immédiate donne $kn \in H$ pour tout $k \in \mathbb{Z}$, c'est-à-dire $n\mathbb{Z} \subseteq H$.

*Inclusion $H \subseteq n\mathbb{Z}$.* Soit $h \in H$. La division euclidienne de $h$ par $n$ s'écrit

$$h = qn + r, \qquad q \in \mathbb{Z}, \quad 0 \le r < n.$$

Alors $r = h - qn$ est différence de deux éléments de $H$ (car $qn \in n\mathbb{Z} \subseteq H$), donc $r \in H$. Si $r > 0$, alors $r \in H^{+}$ avec $r < n$ : cela contredit la minimalité de $n$. Donc $r = 0$ et $h = qn \in n\mathbb{Z}$.

D'où $H = n\mathbb{Z}$.

**2) Unicité.**

Supposons $n\mathbb{Z} = m\mathbb{Z}$ avec $n, m \in \mathbb{N}$. Si $n = 0$, alors $m\mathbb{Z} = \{0\}$ donc $m = 0$. Sinon $n \ge 1$ et $m \ge 1$ ; de $n \in m\mathbb{Z}$ on tire $m \mid n$, et de $m \in n\mathbb{Z}$ on tire $n \mid m$. Deux entiers naturels non nuls qui se divisent mutuellement sont égaux : $n = m$. $\blacksquare$

---

**Pourquoi c'est important.**

- Tout sous-groupe de $\mathbb{Z}$ est **monogène** : $\mathbb{Z}$ est un groupe cyclique infini et tous ses sous-groupes le sont aussi.
- Appliqué à $H = a\mathbb{Z} + b\mathbb{Z}$, on obtient $a\mathbb{Z} + b\mathbb{Z} = d\mathbb{Z}$ avec $d = \operatorname{pgcd}(a,b)$ — c'est exactement le **théorème de Bézout**.
- Appliqué à $H = a\mathbb{Z} \cap b\mathbb{Z}$, on obtient $a\mathbb{Z} \cap b\mathbb{Z} = m\mathbb{Z}$ avec $m = \operatorname{ppcm}(a,b)$.
- En langage d'anneaux : tout idéal de $\mathbb{Z}$ est principal, autrement dit $\mathbb{Z}$ est un **anneau principal**.`,
		date: "2026-08-02",
	},
]

/** Newest first (the array is already curated in display order). */
export function allProblems(): InterestingProblem[] {
	return PROBLEMS
}

/** The default problem shown when no (or an unknown) slug is requested. */
export const DEFAULT_PROBLEM: InterestingProblem = PROBLEMS[0]!

export function getProblem(slug?: string | null): InterestingProblem {
	if (!slug) return DEFAULT_PROBLEM
	return PROBLEMS.find((p) => p.slug === slug) ?? DEFAULT_PROBLEM
}
