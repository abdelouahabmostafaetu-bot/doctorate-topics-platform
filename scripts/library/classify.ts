// المصنّف الذكي — خمس طبقات متتالية.
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

/** أقل مجموع نقاط مقبول من مصنّف الكلمات */
const KEYWORD_THRESHOLD = 3;
/** الفارق المطلوب بين الأول والثاني حتى نثق بالنتيجة */
const MARGIN_RATIO = 1.2;

function hay(s: string): string {
	return stripAccents(s.toLowerCase());
}

/**
 * مصنّف الكلمات المفتاحية: العنوان يُرجّح ثلاث مرات على الملخص،
 * لأن عنوان الكتاب الرياضي وصفيّ جدًا بطبعه.
 */
export function keywordClassify(
	title: string,
	abstract = "",
): { category: CategoryId; score: number; runnerUp: number } | null {
	const t = hay(title);
	const a = hay(abstract);
	const scores: Array<{ id: CategoryId; score: number }> = [];

	for (const [id, words] of Object.entries(KEYWORDS) as Array<[CategoryId, string[]]>) {
		let score = 0;
		for (const w of words) {
			const needle = hay(w);
			if (t.includes(needle)) score += 3;
			else if (a.includes(needle)) score += 1;
		}
		if (score > 0) scores.push({ id, score });
	}

	if (scores.length === 0) return null;
	scores.sort((x, y) => y.score - x.score);

	const top = scores[0];
	const second = scores[1]?.score ?? 0;
	if (top.score < KEYWORD_THRESHOLD) return null;
	// تصنيفان متقاربان = غموض حقيقي -> نرفض ونحجز للمراجعة
	if (second > 0 && top.score < second * MARGIN_RATIO) return null;

	return { category: top.id, score: top.score, runnerUp: second };
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
	const text = `${raw.title ?? ""} ${raw.abstract ?? ""}`;

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

	// الطبقة 2: تصنيف arXiv
	if (raw.arxivCategories?.length) {
		for (const cat of raw.arxivCategories) {
			const id = ARXIV_MAP[cat.trim()];
			if (id) {
				return { category: id, subtopics: pickSubtopics(id, text), classifiedBy: "arxiv", confidence: 0.95 };
			}
		}
	}

	// الطبقة 3: مواضيع OpenAlex
	if (raw.openalexTopics?.length) {
		for (const t of raw.openalexTopics) {
			const id = OPENALEX_MAP[t.id];
			if (id) {
				return { category: id, subtopics: pickSubtopics(id, text), classifiedBy: "openalex", confidence: 0.8 };
			}
		}
	}

	// الطبقة 4: الكلمات المفتاحية ثلاثية اللسان
	const kw = keywordClassify(raw.title ?? "", raw.abstract ?? "");
	if (kw) {
		return {
			category: kw.category,
			subtopics: pickSubtopics(kw.category, text),
			classifiedBy: "keyword",
			confidence: 0.6,
		};
	}

	// الطبقة 5: الحجر
	return null;
}

/**
 * الميزة القاتلة: استنتاج المستوى الدراسي من اسم سلسلة الناشر.
 * أسماء السلاسل تفصح عن المستوى بدقة عالية، ولا أحد يستغل ذلك.
 * النتيجة تطابق نظام LMD الجزائري: ليسانس / ماستر / دكتوراه.
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
	[/cours\s+sp[eé]cialis[eé]s/i, "master"],
	[/london\s+mathematical\s+society\s+student\s+texts/i, "master"],
	// دكتوراه وبحث
	[/lecture\s+notes\s+in\s+mathematics/i, "doctorat"],
	[/grundlehren|ergebnisse\s+der\s+mathematik/i, "doctorat"],
	[/cambridge\s+studies\s+in\s+advanced\s+mathematics/i, "doctorat"],
	[/ast[eé]risque|m[eé]moires\s+de\s+la\s+smf/i, "doctorat"],
	[/panoramas\s+et\s+synth[eè]ses|documents\s+math[eé]matiques/i, "doctorat"],
	[/springer\s+monographs\s+in\s+mathematics/i, "doctorat"],
	[/encyclopedia\s+of\s+mathematics\s+and\s+its\s+applications/i, "doctorat"],
];

/** مؤشرات المستوى من العنوان نفسه — تُستعمل حين لا تتوفر السلسلة */
const LEVEL_FROM_TITLE: Array<[RegExp, Level]> = [
	[/\b(introduction|introductory|elementary|a\s+first\s+course|basics|beginner)\b/i, "licence"],
	[/\b(introduction|premiers?\s+pas|cours\s+[eé]l[eé]mentaire)\b/i, "licence"],
	[/\b(advanced|topics\s+in|selected\s+topics|modern\s+aspects|research)\b/i, "doctorat"],
	[/\b(graduate|second\s+course)\b/i, "master"],
];

export function detectLevel(raw: RawItem): Level | undefined {
	const series = raw.series ?? "";
	for (const [re, level] of LEVEL_FROM_SERIES) if (re.test(series)) return level;

	const title = raw.title ?? "";
	for (const [re, level] of LEVEL_FROM_TITLE) if (re.test(title)) return level;

	return undefined;
}

export function detectBookKind(raw: RawItem): BookKind | undefined {
	const s = `${raw.series ?? ""} ${raw.title ?? ""} ${raw.type ?? ""}`.toLowerCase();
	if (/proceedings|conference|colloqu|congress|actes\b|s[eé]minaire/.test(s)) return "proceedings";
	if (/lecture\s+notes|notes\s+de\s+cours|cours\b|polycopi/.test(s)) return "lecture-notes";
	if (/encyclopedia|handbook|dictionary|companion|encyclop[eé]die/.test(s)) return "reference";
	if (/textbook|course|introduction|manuel|trait[eé]/.test(s)) return "textbook";
	if (/monograph|memoir|monographie|m[eé]moire/.test(s)) return "monograph";
	return undefined;
}
