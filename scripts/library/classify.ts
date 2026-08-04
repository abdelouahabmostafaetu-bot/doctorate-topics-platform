// المصنف الذكي — ست طبقات متتالية.
// القاعدة الذهبية: تصنيف خاطئ أسوأ من غياب التصنيف. عند الشك -> الحجر.

import { ARXIV_MAP, CATEGORY_BY_ID, KEYWORDS, MSC_MAP, OPENALEX_MAP } from "./taxonomy";
import { stripAccents } from "./normalize";
import type { BookKind, CategoryId, ClassifiedBy, Level, RawItem } from "./types";

export type Classification = {
	category: CategoryId;
	subtopics: string[];
	classifiedBy: ClassifiedBy;
	confidence: number;
};

/** أقل مجموع نقاط مقبول حين يوجد تطابق في العنوان */
const KEYWORD_THRESHOLD = 3;
/** الفارق المطلوب بين الأول والثاني حتى نثق بالنتيجة */
const MARGIN_RATIO = 1.2;

// درس من تجربة حقيقية: "Handbook of Teichmüller theory" صُنف جبرًا
// لأن ملخصه يذكر زمرًا ومقاسات. الملخص وحده إشارة ضعيفة:
// يذكر أدوات البرهان لا موضوع الكتاب. فله عتبة أعلى وفارق أوسع.
const ABSTRACT_ONLY_THRESHOLD = 6;
const ABSTRACT_ONLY_MARGIN = 2;

function hay(s: string): string {
	return stripAccents(s.toLowerCase());
}

/**
 * مصطلحات مميزة: كل واحد يحدد التخصص وحده بلا لبس.
 * موضوع مسمى أقوى من عد كلمات عامة: من قال "Navier-Stokes"
 * يكتب عن المعادلات الجزئية يقينًا، مهما ذكر ملخصه من جبر وتحليل.
 * تُفحص على العنوان فقط — الترتيب مقصود: الأخص قبل الأعم.
 */
const SIGNATURE_TERMS: Array<[RegExp, CategoryId]> = [
	// هندسة وطوبولوجيا
	[/teichmuller|moduli\s+spaces?|mapping\s+class\s+group/i, "geometry"],
	[/riemann\s+surfaces?|kleinian|hyperbolic\s+(manifold|geometry|surface)/i, "geometry"],
	[/ricci\s+flow|minimal\s+surfaces?|gromov|cat\(0\)|orbifold/i, "geometry"],
	[/toric\s+variet|abelian\s+variet|birational|intersection\s+theory/i, "geometry"],
	[/knot\s+theory|braid\s+group|4-manifold|surg[ei]/i, "geometry"],
	[/symplectic|contact\s+geometry|floer/i, "geometry"],
	// جبر ونطرية أعداد
	[/galois|class\s+field|iwasawa|langlands|automorphic/i, "algebra"],
	[/modular\s+forms?|elliptic\s+curves?|arithmetic\s+geometry|diophantine/i, "algebra"],
	[/hopf\s+algebra|cluster\s+algebra|quiver|root\s+systems?|coxeter/i, "algebra"],
	// معادلات تفاضلية
	[/navier-?stokes|euler\s+equations?|conservation\s+laws?/i, "pde"],
	[/kinetic\s+(equation|theory)|boltzmann|vlasov|kdv|schrodinger\s+equation/i, "pde"],
	[/ergodic\s+theory|hamiltonian\s+systems?|bifurcation|attractor/i, "pde"],
	// احتمالات
	[/percolation|random\s+matri|levy\s+process|malliavin|branching\s+process/i, "probability"],
	[/stochastic\s+(calculus|analysis|process)|brownian|martingale/i, "probability"],
	// تحليل
	[/hardy\s+space|bergman\s+space|several\s+complex\s+variables|wavelet/i, "analysis"],
	[/c\*-algebra|von\s+neumann\s+algebra|spectral\s+theory/i, "analysis"],
	// تحليل عددي
	[/discontinuous\s+galerkin|multigrid|isogeometric|spectral\s+methods?/i, "numerical"],
	// متقطعة
	[/matroid|hypergraph|ramsey\s+theory|extremal\s+(graph|combinator)/i, "discrete"],
	// تحسين
	[/mean\s+field\s+game|semidefinite\s+program|variational\s+inequalit/i, "optimization"],
	// فيزياء رياضية
	[/conformal\s+field\s+theory|gauge\s+theory|string\s+theory|integrable\s+system/i, "mathphysics"],
	// منطق
	[/forcing|o-minimal|descriptive\s+set\s+theory|homotopy\s+type\s+theory/i, "logic"],
	// حاسوب
	[/post-?quantum|lattice-?based\s+crypto|error-?correcting\s+code/i, "computing"],
	// مالية
	[/stochastic\s+volatilit|credit\s+risk|black-?scholes/i, "finance"],
	// حيوية
	[/epidemic\s+model|population\s+dynamics|systems?\s+biolog/i, "biomath"],
];

function signatureMatch(title: string): CategoryId | null {
	const t = hay(title);
	for (const [re, id] of SIGNATURE_TERMS) if (re.test(t)) return id;
	return null;
}

/**
 * مصنف الكلمات: العنوان يرجح ثلاث مرات على الملخص،
 * لأن عنوان الكتاب الرياضي وصفي جدًا بطبعه.
 * نفرق بين نقاط العنوان ونقاط الملخص لأن الثقة فيهما مختلفة تمامًا.
 */
export function keywordClassify(
	title: string,
	abstract = "",
): { category: CategoryId; score: number; fromTitle: boolean } | null {
	const t = hay(title);
	const a = hay(abstract);
	const scores: Array<{ id: CategoryId; score: number; titleScore: number }> = [];

	for (const [id, words] of Object.entries(KEYWORDS) as Array<[CategoryId, string[]]>) {
		let score = 0;
		let titleScore = 0;
		for (const w of words) {
			const needle = hay(w);
			if (t.includes(needle)) {
				score += 3;
				titleScore += 3;
			} else if (a.includes(needle)) {
				score += 1;
			}
		}
		if (score > 0) scores.push({ id, score, titleScore });
	}

	if (scores.length === 0) return null;
	scores.sort((x, y) => y.score - x.score);

	const top = scores[0];
	const second = scores[1]?.score ?? 0;
	const fromTitle = top.titleScore > 0;

	const threshold = fromTitle ? KEYWORD_THRESHOLD : ABSTRACT_ONLY_THRESHOLD;
	const margin = fromTitle ? MARGIN_RATIO : ABSTRACT_ONLY_MARGIN;

	if (top.score < threshold) return null;
	// تصنيفان متقاربان = غموض حقيقي -> نرفض ونحجز للمراجعة
	if (second > 0 && top.score < second * margin) return null;

	return { category: top.id, score: top.score, fromTitle };
}

/** استنتاج المواضيع الفرعية من نص العنوان والملخص */
function pickSubtopics(category: CategoryId, text: string): string[] {
	const subs = CATEGORY_BY_ID[category].subtopics;
	const h = hay(text);
	const hits = subs.filter((s) => h.includes(hay(s)));
	return hits.length > 0 ? hits.slice(0, 3) : [];
}

/**
 * التصنيف المتتالي.
 * يعيد null عندما لا يمكن التصنيف بثقة -> يذهب السجل إلى الحجر لا إلى النشر.
 */
export function classify(raw: RawItem): Classification | null {
	const title = raw.title ?? "";
	const text = `${title} ${raw.abstract ?? ""}`;

	// الطبقة 1: رمز MSC صريح (zbMATH, EuDML, Numdam, SMF) — ثقة كاملة
	if (raw.mscCodes?.length) {
		for (const code of raw.mscCodes) {
			const two = code.trim().slice(0, 2);
			const id = MSC_MAP[two];
			if (id) {
				return { category: id, subtopics: pickSubtopics(id, text), classifiedBy: "msc", confidence: 1 };
			}
		}
	}

	// الطبقة 2: تصنيف arXiv — يأتي أيضًا من حقول تخصص HAL المحولة
	if (raw.arxivCategories?.length) {
		for (const cat of raw.arxivCategories) {
			const id = ARXIV_MAP[cat.trim()];
			if (id) {
				return { category: id, subtopics: pickSubtopics(id, text), classifiedBy: "arxiv", confidence: 0.95 };
			}
		}
	}

	// الطبقة 3: موضوع مسمى في العنوان — أقوى من أي عد كلمات
	const sig = signatureMatch(title);
	if (sig) {
		return { category: sig, subtopics: pickSubtopics(sig, text), classifiedBy: "keyword", confidence: 0.85 };
	}

	// الطبقة 4: مواضيع OpenAlex
	if (raw.openalexTopics?.length) {
		for (const t of raw.openalexTopics) {
			const id = OPENALEX_MAP[t.id];
			if (id) {
				return { category: id, subtopics: pickSubtopics(id, text), classifiedBy: "openalex", confidence: 0.8 };
			}
		}
	}

	// الطبقة 5: الكلمات المفتاحية ثلاثية اللسان
	const kw = keywordClassify(title, raw.abstract ?? "");
	if (kw) {
		return {
			category: kw.category,
			subtopics: pickSubtopics(kw.category, text),
			classifiedBy: "keyword",
			// ثقة أقل حين لم يساهم العنوان بشيء
			confidence: kw.fromTitle ? 0.6 : 0.5,
		};
	}

	// الطبقة 6: الحجر
	return null;
}

/**
 * الميزة القاتلة: استنتاج المستوى الدراسي من اسم سلسلة الناشر.
 * أسماء السلاسل تفصح عن المستوى بدقة عالية، ولا أحد يستغل ذلك.
 * النتيجة تطابق نطام LMD الجزائري: ليسانس / ماستر / دكتوراه.
 */
const LEVEL_FROM_SERIES: Array<[RegExp, Level]> = [
	// ليسانس
	[/undergraduate\s+texts\s+in\s+mathematics/i, "licence"],
	[/springer\s+undergraduate|\bSUMS\b/i, "licence"],
	[/undergraduate\s+lecture\s+notes/i, "licence"],
	[/student\s+mathematical\s+library/i, "licence"],
	// ماستر
	[/graduate\s+texts\s+in\s+mathematics|\bGTM\b/i, "master"],
	[/graduate\s+studies\s+in\s+mathematics/i, "master"],
	[/universitext/i, "master"],
	[/cours\s+sp[ee]cialis[ee]s/i, "master"],
	[/london\s+mathematical\s+society\s+student\s+texts/i, "master"],
	// دكتوراه وبحث
	[/lecture\s+notes\s+in\s+mathematics/i, "doctorat"],
	[/grundlehren|ergebnisse\s+der\s+mathematik/i, "doctorat"],
	[/cambridge\s+studies\s+in\s+advanced\s+mathematics/i, "doctorat"],
	[/ast[ee]risque|m[ee]moires\s+de\s+la\s+smf/i, "doctorat"],
	[/panoramas\s+et\s+synth[ee]ses|documents\s+math[ee]matiques/i, "doctorat"],
	[/springer\s+monographs\s+in\s+mathematics/i, "doctorat"],
	[/encyclopedia\s+of\s+mathematics\s+and\s+its\s+applications/i, "doctorat"],
	[/handbook\s+of/i, "doctorat"],
	[/progress\s+in\s+mathematics|irma\s+lectures/i, "doctorat"],
	[/ems\s+(tracts|monographs|series\s+of\s+lectures)/i, "doctorat"],
];

/** مؤشرات المستوى من العنوان نفسه — تُستعمل حين لا تتوفر السلسلة */
const LEVEL_FROM_TITLE: Array<[RegExp, Level]> = [
	[/\b(introduction|introductory|elementary|a\s+first\s+course|basics|beginner)\b/i, "licence"],
	[/\b(premiers?\s+pas|cours\s+[ee]l[ee]mentaire)\b/i, "licence"],
	[/\b(handbook|encyclopedia|advanced|topics\s+in|selected\s+topics|research)\b/i, "doctorat"],
	[/\b(graduate|second\s+course)\b/i, "master"],
];

export function detectLevel(raw: RawItem): Level | undefined {
	// السلسلة أولا، وإلا فالعنوان. نفحص العنوان الفرعي أيضًا:
	// كثير من الناشرين يكتبون "an introduction" في العنوان الفرعي لا الرئيس.
	const series = `${raw.series ?? ""} ${raw.publisher ?? ""}`;
	for (const [re, level] of LEVEL_FROM_SERIES) if (re.test(series)) return level;

	const titles = `${raw.title ?? ""} ${raw.subtitle ?? ""}`;
	for (const [re, level] of LEVEL_FROM_SERIES) if (re.test(titles)) return level;
	for (const [re, level] of LEVEL_FROM_TITLE) if (re.test(titles)) return level;

	return undefined;
}

export function detectBookKind(raw: RawItem): BookKind | undefined {
	const s = `${raw.series ?? ""} ${raw.title ?? ""} ${raw.type ?? ""}`.toLowerCase();
	if (/proceedings|conference|colloqu|congress|actes\b|s[ee]minaire/.test(s)) return "proceedings";
	if (/lecture\s+notes|notes\s+de\s+cours|cours\b|polycopi/.test(s)) return "lecture-notes";
	if (/encyclopedia|handbook|dictionary|companion|encyclop[ee]die/.test(s)) return "reference";
	if (/textbook|course|introduction|manuel|trait[ee]/.test(s)) return "textbook";
	if (/monograph|memoir|monographie|m[ee]moire/.test(s)) return "monograph";
	return undefined;
}
